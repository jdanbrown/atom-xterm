util = require 'util'
os = require 'os'
fs = require 'fs-plus'
path = require 'path'
debounce = require 'debounce'
Terminal = require 'xterm'
Terminal.loadAddon('fit')
{CompositeDisposable} = require 'atom'
 # see https://github.com/f/atom-term.js/pull/5
 # see https://github.com/f/atom-term.js/pull/4
window.isMac = window.navigator.userAgent.indexOf('Mac') != -1;

(->
  origBindMouse = Terminal.prototype.bindMouse
  Terminal.prototype.bindMouse = ->
    out = origBindMouse.call(this)
    Terminal.on(this.element, 'mouseup', =>
      return if this.mouseEvents
      sel = window.getSelection()
      return if sel == null || sel.rangeCount < 1
      selStr = sel.getRangeAt(0).toString()
      if selStr != ''
        this.emit('selection', {contents: selStr})
    )
    return out
)()

{Task} = require 'atom'
{Emitter}  = require 'event-kit'
{$, View} = require 'atom-space-pen-views'

last = (str)-> str[str.length-1]

renderTemplate = (template, data) ->
  vars = Object.keys data
  vars.reduce (_template, key) ->
    _template.split(///\{\{\s*#{key}\s*\}\}///)
      .join data[key]
  , template.toString()

createColorsStyleSheet = (parent, termID, colors) ->
  termHTMLID = "term3-term-#{termID}"
  title = "#{termHTMLID}-colors"
  ss = document.querySelector("style[title=\"#{title}\"]")
  if ss != null
    ssEl.parentElement.removeChild(ssEl)
  styles = "\##{termHTMLID} { color: red; }"
  stylePrefix = "\##{termHTMLID}"
  styles = []
  addStyle = (s) -> styles.push(stylePrefix + s)

  i = 0
  for c in colors.slice(0, 16)
    addStyle(" .xterm-color-#{i} { color: #{c}; }")
    addStyle(" .xterm-bg-color-#{i} { background-color: #{c}; }")
    i += 1
  addStyle(".terminal { background: #{colors[16]}; color: #{colors[17]}; }")
  addStyle(" .xterm-viewport { background: #{colors[16]}; color: #{colors[17]}; }")

  ssEl = document.createElement('style')
  ssEl.title = title
  ssEl.innerHTML = styles.join("\n")
  parent.appendChild(ssEl)

class TermView extends View
  constructor: (@opts={})->
    @emitter = new Emitter
    super

  focusPane: () ->
    pane = atom.workspace.getActivePane()
    items = pane.getItems()
    index = items.indexOf(this)
    return unless index != -1
    pane.activateItemAtIndex(index)
    focus()

  getForked: () ->
    return @opts.forkPTY

  @content: ->
    @div class: 'term3'

  onData: (callback) ->
    @emitter.on 'data', callback

  onExit: (callback) ->
    @emitter.on 'exit', callback

  onResize: (callback) ->
    @emitter.on 'resize', callback

  onSTDIN: (callback) ->
    @emitter.on 'stdin', callback

  onSTDOUT: (callback) ->
    @emitter.on 'stdout', callback

  onFocus: (callback) ->
    @emitter.on 'focus', callback

  input: (data) ->
    return unless @term
    try
      if @ptyProcess
        base64ed = Buffer.from(data, 'binary').toString('base64')
        @ptyProcess.send event: 'input', text: base64ed
      else
        @term.write data
    catch error
      console.error error
    @resizeToPane_()
    @focusTerm()

  attached: () ->
    @disposable = new CompositeDisposable();

    {cols, rows, cwd, shell, shellArguments, shellOverride, runCommand, colors, cursorBlink, scrollback} = @opts
    args = shellArguments.split(/\s+/g).filter (arg) -> arg

    parent = this.get(0)

    createColorsStyleSheet(parent, this.id, colors)

    @term = term = new Terminal {
      colors, cursorBlink, scrollback
    }

    term.on "data", (data) =>
      # let the remote term write to stdin - we slurp up its stdout
      if @ptyProcess
        @input data

    term.on "title", (title) =>
      if title.length > 20
        split = title.split(path.sep)
        newTitle = ""
        if split[0] == ""
          split.shift(1)

        if split.length == 1
          title = title.slice(0, 10) + "..." + title.slice(-10)
        else
          title = path.sep + [split[0], "...", split[split.length - 1]].join(path.sep)
          if title.length > 25
            title = path.sep + [split[0], split[split.length - 1]].join(path.sep)
            title = title.slice(0, 10) + "..." + title.slice(-10)

      @title_ = title
      @emitter.emit 'did-change-title', title

    term.on "selection", ({ contents }) =>
      atom.clipboard.write contents

    term.on "focus", =>
      @emitter.emit "focus"

    term.open parent

    term.element.id = "term3-term-#{this.id}"

    term.fit()
    { cols, rows } = @getDimensions

    if not @opts.forkPTY
      term.end = => @exit()
    else
      processPath = require.resolve './pty'
      @ptyProcess = Task.once processPath, fs.absolute(atom.project.getPaths()[0] ? '~'), shellOverride, cols, rows, args

      @ptyProcess.on 'term3:data', (data) =>
        return unless @term
        utf8 = new Buffer(data, "base64").toString("utf-8")
        @term.write utf8
        @emitter.emit('stdout', utf8)

      @ptyProcess.on 'term3:exit', () =>
        @exit()


    @input "#{runCommand}#{os.EOL}" if (runCommand)
    term.focus()
    @applyStyle()
    @attachEvents()
    @resizeToPane_()

  resize: (cols, rows) ->
    return unless @term
    return unless cols > 0 and rows > 0 and isFinite(cols) and isFinite(rows)
    # console.log @term.rows, @term.cols, "->", rows, cols
    try
      if @ptyProcess
        @ptyProcess.send {event: 'resize', rows, cols}
      if @term and not (@term.rows is rows and @term.cols is cols)
        @term.resize cols, rows
    catch error
      console.error error
      return

    @emitter.emit 'resize', {cols, rows}

  titleVars: ->
    bashName: last @opts.shell.split '/'
    hostName: os.hostname()
    platform: process.platform
    home    : process.env.HOME

  getTitle: ->
    return @title_ if @title_
    @vars = @titleVars()
    titleTemplate = @opts.titleTemplate or "({{ bashName }})"
    renderTemplate titleTemplate, @vars

  onDidChangeTitle: (callback) ->
    @emitter.on 'did-change-title', callback

  getIconName: ->
    "terminal"

  applyStyle: ->
    # remove background color in favor of the atom background
    # @term.element.style.background = null
    @term.element.style.fontFamily = (
      @opts.fontFamily or
      atom.config.get('editor.fontFamily') or
      # (Atom doesn't return a default value if there is none)
      # so we use a poor fallback
      "monospace"
    )
    # Atom returns a default for fontSize
    @term.element.style.fontSize = (
      @opts.fontSize or
      atom.config.get('editor.fontSize')
    ) + "px"

  attachEvents: ->
    @resizeToPane_ = @resizeToPane_.bind this
    @on 'focus', @focus
    $(window).on 'resize', => @resizeToPane_()
    @disposable.add atom.workspace.getActivePane().observeFlexScale => setTimeout (=> @resizeToPane_()), 300
    @disposable.add atom.commands.add "atom-workspace", "term3:paste", => @paste()

  paste: ->
    @input atom.clipboard.read()

  focus: ->
    @resizeToPane_()
    @focusTerm()

  focusTerm: ->
    return unless @term
    @term.focus()

  resizeToPane_: ->
    return unless @ptyProcess and @term
    @term.fit()
    {cols, rows} = @getDimensions()
    @resize cols, rows

  getDimensions: ->
    cols = @term.cols
    rows = @term.rows
    {cols, rows}

  exit: ->
    pane = atom.workspace.getActivePane()
    pane.destroyItem(this);

  destroy: ->
    if @ptyProcess
      @ptyProcess.terminate()
      @ptyProcess = null
    # we always have a @term
    if @term
      @emitter.emit('exit')
      @term.destroy()
      @term = null
      @off 'focus', @focus
      $(window).off 'resize', @resizeToPane_
    if @disposable
      @disposable.dispose()
      @disposable = null


module.exports = TermView
