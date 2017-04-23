'use babel';

import os from 'os';
import fs from 'fs-plus';
import path from 'path';
import Terminal from 'xterm';
Terminal.loadAddon('fit');
import { Disposable, CompositeDisposable } from 'atom';
// see https://github.com/f/atom-term.js/pull/5
// see https://github.com/f/atom-term.js/pull/4
window.isMac = window.navigator.userAgent.indexOf('Mac') !== -1;

(function() {
  const origBindMouse = Terminal.prototype.bindMouse;
  Terminal.prototype.bindMouse = function() {
    const out = origBindMouse.call(this);
    Terminal.on(this.element, 'mouseup', () => {
      if (this.mouseEvents) {
        return;
      }
      const sel = window.getSelection();
      if (sel === null || sel.rangeCount < 1) {
        return;
      }
      const selStr = sel.getRangeAt(0).toString();
      if (selStr !== '') {
        return this.emit('selection', { contents: selStr });
      }
    });
    return out;
  };
})();

import { Task } from 'atom';
import { Emitter } from 'event-kit';
import { $, View } from 'atom-space-pen-views';

const last = str => str[str.length - 1];

const renderTemplate = function(template, data) {
  const vars = Object.keys(data);
  return vars.reduce(
    (_template, key) =>
      _template.split(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`)).join(data[key]),
    template.toString(),
  );
};

class TermView extends View {
  constructor(opts = {}) {
    super(...arguments);
    this.opts = opts;
    this.emitter = new Emitter();
  }

  getURI() {
    return 'atom://term3-term-view';
  }

  serialize() {
    return {
      deserializer: 'term3/TermView',
    };
  }

  getElement() {
    return this.get(0);
  }

  getForked() {
    return this.opts.forkPTY;
  }

  static content() {
    return this.div({ class: 'term3' });
  }

  onData(callback) {
    return this.emitter.on('data', callback);
  }

  onExit(callback) {
    return this.emitter.on('exit', callback);
  }

  onResize(callback) {
    return this.emitter.on('resize', callback);
  }

  onSTDIN(callback) {
    return this.emitter.on('stdin', callback);
  }

  onSTDOUT(callback) {
    return this.emitter.on('stdout', callback);
  }

  onFocus(callback) {
    return this.emitter.on('focus', callback);
  }

  onBlur(callback) {
    return this.emitter.on('blur', callback);
  }

  input(data) {
    if (!this.term) {
      return;
    }
    try {
      if (this.ptyProcess) {
        const base64ed = Buffer.from(data, 'binary').toString('base64');
        this.ptyProcess.send({ event: 'input', text: base64ed });
      } else {
        this.term.write(data);
      }
    } catch (error) {
      console.error(error);
    }
    this.resizeToPane_();
    return this.focusTerm();
  }

  attached() {
    let term;
    this.disposable = new CompositeDisposable();

    let {
      cols,
      rows,
      shellArguments,
      shellOverride,
      runCommand,
      colors,
      cursorBlink,
      scrollback,
    } = this.opts;
    const args = (shellArguments || '').split(/\s+/g).filter(arg => arg);

    const parent = this.get(0);

    this.term = term = new Terminal({
      colors,
      cursorBlink,
      scrollback,
    });

    term.on('data', data => {
      // let the remote term write to stdin - we slurp up its stdout
      if (this.ptyProcess) {
        return this.input(data);
      }
    });

    term.on('title', title => {
      if (title.length > 20) {
        const split = title.split(path.sep);
        if (split[0] === '') {
          split.shift(1);
        }

        if (split.length === 1) {
          title = title.slice(0, 10) + '...' + title.slice(-10);
        } else {
          title =
            path.sep +
            [split[0], '...', split[split.length - 1]].join(path.sep);
          if (title.length > 25) {
            title =
              path.sep + [split[0], split[split.length - 1]].join(path.sep);
            title = title.slice(0, 10) + '...' + title.slice(-10);
          }
        }
      }

      this.title_ = title;
      return this.emitter.emit('did-change-title', title);
    });

    term.on('selection', ({ contents }) => {
      return atom.clipboard.write(contents);
    });

    term.on('focus', () => {
      return this.emitter.emit('focus');
    });

    term.on('blur', () => {
      return this.emitter.emit('blur');
    });

    term.open(parent);

    term.element.id = `term3-term-${this.id}`;

    term.fit();
    ({ cols, rows } = this.getDimensions);

    if (!this.opts.forkPTY) {
      term.end = () => this.exit();
    } else {
      let left;
      const processPath = require.resolve('./pty');
      this.ptyProcess = Task.once(
        processPath,
        fs.absolute((left = atom.project.getPaths()[0]) != null ? left : '~'),
        shellOverride,
        cols,
        rows,
        args,
      );

      this.ptyProcess.on('term3:data', data => {
        if (!this.term) {
          return;
        }
        const utf8 = new Buffer(data, 'base64').toString('utf-8');
        this.term.write(utf8);
        return this.emitter.emit('stdout', utf8);
      });

      this.ptyProcess.on('term3:exit', () => {
        return this.exit();
      });
    }

    if (runCommand) {
      this.input(`${runCommand}${os.EOL}`);
    }
    this.applyStyle();
    this.attachEvents();
    this.resizeToPane_();
    term.focus();
  }

  resize(cols, rows) {
    if (!this.term) {
      return;
    }
    if (!(cols > 0) || !(rows > 0) || !isFinite(cols) || !isFinite(rows)) {
      return;
    }
    try {
      if (this.ptyProcess) {
        this.ptyProcess.send({ event: 'resize', rows, cols });
      }
      if (this.term && !(this.term.rows === rows && this.term.cols === cols)) {
        this.term.resize(cols, rows);
      }
    } catch (error) {
      console.error(error);
      return;
    }

    return this.emitter.emit('resize', { cols, rows });
  }

  titleVars() {
    return {
      bashName: last(this.opts.shell.split('/')),
      hostName: os.hostname(),
      platform: process.platform,
      home: process.env.HOME,
    };
  }

  getTitle() {
    if (this.title_) {
      return this.title_;
    }
    this.vars = this.titleVars();
    const titleTemplate = this.opts.titleTemplate || '({{ bashName }})';
    return renderTemplate(titleTemplate, this.vars);
  }

  onDidChangeTitle(callback) {
    return this.emitter.on('did-change-title', callback);
  }

  getIconName() {
    return 'terminal';
  }

  applyStyle() {
    // remove background color in favor of the atom background
    // @term.element.style.background = null
    this.term.element.style.fontFamily =
      this.opts.fontFamily ||
      atom.config.get('editor.fontFamily') ||
      // (Atom doesn't return a default value if there is none)
      // so we use a poor fallback
      'monospace';
    // Atom returns a default for fontSize
    return (this.term.element.style.fontSize =
      (this.opts.fontSize || atom.config.get('editor.fontSize')) + 'px');
  }

  attachEvents() {
    this.resizeToPane_ = this.resizeToPane_.bind(this);
    this.on('focus', this.focus);
    $(window).on('resize', () => this.resizeToPane_());
    this.disposable.add(
      atom.workspace
        .getActivePane()
        .observeFlexScale(() => setTimeout(() => this.resizeToPane_(), 300)),
    );
    return this.disposable.add(
      atom.commands.add('atom-workspace', 'term3:paste', () => this.paste()),
      atom.commands.add(this, {
        'core:move-up': () => this.term.scrollDisp(-1),
        'core:move-down': () => this.term.scrollDisp(1),
        'core:page-up': () => this.term.scrollPages(-1),
        'core:page-down': () => this.term.scrollPages(1),
        'core:move-to-top': () => this.term.scrollToTop(),
        'core:move-to-bottom': () => this.term.scrollToBottom(),
      }),
    );
  }

  paste() {
    return this.input(atom.clipboard.read());
  }

  focus() {
    this.resizeToPane_();
    this.focusTerm();
    process.nextTick(() => this.focusTerm());
  }

  focusTerm() {
    if (!this.term) {
      return;
    }
    this.term.focus();
  }

  resizeToPane_() {
    if (!this.ptyProcess || !this.term) {
      return;
    }
    this.term.fit();
    const { cols, rows } = this.getDimensions();
    return this.resize(cols, rows);
  }

  getDimensions() {
    const { cols } = this.term;
    const { rows } = this.term;
    return { cols, rows };
  }

  exit() {
    const pane = atom.workspace.getActivePane();
    return pane.destroyItem(this);
  }

  onDidDestroy() {
    return new Disposable(() => this.destroy());
  }

  destroy() {
    if (this.ptyProcess) {
      this.ptyProcess.terminate();
      this.ptyProcess = null;
    }
    // we always have a @term
    if (this.term) {
      this.emitter.emit('exit');
      this.term.destroy();
      this.term = null;
      this.off('focus', this.focus);
      $(window).off('resize', this.resizeToPane_);
    }
    if (this.disposable) {
      this.disposable.dispose();
      return (this.disposable = null);
    }
  }
}

export default TermView;
