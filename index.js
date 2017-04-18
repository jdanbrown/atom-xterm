'use babel';

import path from 'path';
import TermView from './lib/term-view';
import ListView from './lib/build/list-view';
import store from './lib/store';
import { Emitter } from 'event-kit';
const keypather = require('keypather')();
import { CompositeDisposable } from 'event-kit';

const capitalize = str => str[0].toUpperCase() + str.slice(1).toLowerCase();

const getColors = function() {
  const {
    normalBlack,
    normalRed,
    normalGreen,
    normalYellow,
    normalBlue,
    normalPurple,
    normalCyan,
    normalWhite,
    brightBlack,
    brightRed,
    brightGreen,
    brightYellow,
    brightBlue,
    brightPurple,
    brightCyan,
    brightWhite,
    background,
    foreground,
  } = atom.config.getAll('term3.colors')[0].value;
  return [
    normalBlack,
    normalRed,
    normalGreen,
    normalYellow,
    normalBlue,
    normalPurple,
    normalCyan,
    normalWhite,
    brightBlack,
    brightRed,
    brightGreen,
    brightYellow,
    brightBlue,
    brightPurple,
    brightCyan,
    brightWhite,
    background,
    foreground,
  ].map(color => (color.toHexString == null ? color : color.toHexString()));
};

const config = {
  autoRunCommand: {
    type: 'string',
    default: '',
  },
  titleTemplate: {
    type: 'string',
    default: 'Terminal ({{ bashName }})',
  },
  fontFamily: {
    type: 'string',
    default: '',
  },
  fontSize: {
    type: 'string',
    default: '',
  },
  colors: {
    type: 'object',
    properties: {
      normalBlack: {
        type: 'color',
        default: '#2e3436',
      },
      normalRed: {
        type: 'color',
        default: '#cc0000',
      },
      normalGreen: {
        type: 'color',
        default: '#4e9a06',
      },
      normalYellow: {
        type: 'color',
        default: '#c4a000',
      },
      normalBlue: {
        type: 'color',
        default: '#3465a4',
      },
      normalPurple: {
        type: 'color',
        default: '#75507b',
      },
      normalCyan: {
        type: 'color',
        default: '#06989a',
      },
      normalWhite: {
        type: 'color',
        default: '#d3d7cf',
      },
      brightBlack: {
        type: 'color',
        default: '#555753',
      },
      brightRed: {
        type: 'color',
        default: '#ef2929',
      },
      brightGreen: {
        type: 'color',
        default: '#8ae234',
      },
      brightYellow: {
        type: 'color',
        default: '#fce94f',
      },
      brightBlue: {
        type: 'color',
        default: '#729fcf',
      },
      brightPurple: {
        type: 'color',
        default: '#ad7fa8',
      },
      brightCyan: {
        type: 'color',
        default: '#34e2e2',
      },
      brightWhite: {
        type: 'color',
        default: '#eeeeec',
      },
      background: {
        type: 'color',
        default: '#000000',
      },
      foreground: {
        type: 'color',
        default: '#f0f0f0',
      },
    },
  },
  scrollback: {
    type: 'integer',
    default: 1000,
  },
  cursorBlink: {
    type: 'boolean',
    default: true,
  },
  shellOverride: {
    type: 'string',
    default: '',
  },
  shellArguments: {
    type: 'string',
    default: (function({ SHELL, HOME }) {
      switch (path.basename(SHELL && SHELL.toLowerCase())) {
        case 'bash':
          return `--init-file ${path.join(HOME, '.bash_profile')}`;
        case 'zsh':
          return '-l';
        default:
          return '';
      }
    })(process.env),
  },
  openPanesInSameSplit: {
    type: 'boolean',
    default: false,
  },
};

export default {
  termViews: [],
  focusedTerminal: false,
  emitter: new Emitter(),
  config,
  disposables: null,

  activate(state) {
    this.state = state;
    this.disposables = new CompositeDisposable();

    if (!process.env.LANG) {
      console.warn(
        'Term3: LANG environment variable is not set. Fancy characters (å, ñ, ó, etc`) may be corrupted. The only work-around is to quit Atom and run `atom` from your shell.',
      );
    }

    ['up', 'right', 'down', 'left'].forEach(direction => {
      return this.disposables.add(
        atom.commands.add(
          'atom-workspace',
          `term3:open-split-${direction}`,
          this.splitTerm.bind(this, direction),
        ),
      );
    });

    this.disposables.add(
      atom.commands.add(
        'atom-workspace',
        'term3:open',
        this.newTerm.bind(this),
      ),
    );
    this.disposables.add(
      atom.commands.add(
        'atom-workspace',
        'term3:pipe-path',
        this.pipeTerm.bind(this, 'path'),
      ),
    );
    this.disposables.add(
      atom.commands.add(
        'atom-workspace',
        'term3:pipe-selection',
        this.pipeTerm.bind(this, 'selection'),
      ),
    );

    this.disposables.add(
      atom.workspace.addOpener(uri => {
        if (uri === 'atom://term3-term-view') {
          return this.newTerm();
        }
      }),
    );

    this.disposables.add(
      atom.workspace.observeActivePaneItem(item => {
        if (item instanceof TermView) {
          item.focus();
        }
      }),
    );

    this.disposables.add(
      atom.packages.onDidActivatePackage(function(pkg) {
        if (pkg.name !== 'tree-view') {
          return;
        }
        const node = new ListView();
        const treeView = pkg.mainModule.treeView.element;
        const el = treeView.querySelector('.tree-view-scroller');
        return el.insertBefore(node, el.firstChild);
      }),
    );
  },

  service_0_1_3() {
    return {
      getTerminals: this.getTerminals.bind(this),
      onTerm: this.onTerm.bind(this),
      newTerm: this.newTerm.bind(this),
    };
  },

  getTerminals() {
    return store.getState().terminals.map(t => t.term);
  },

  onTerm(callback) {
    return this.emitter.on('term', callback);
  },

  newTerm(forkPTY = true, rows = 30, cols = 80, title = 'tty') {
    const termView = this.createTermView(forkPTY, rows, cols, title);
    const pane = atom.workspace.getActivePane();
    const item = pane.addItem(termView);
    pane.activateItem(item);
    return termView;
  },

  createTermView(forkPTY = true, rows = 30, cols = 80, title = 'tty') {
    const opts = {
      runCommand: atom.config.get('term3.autoRunCommand'),
      shellOverride: atom.config.get('term3.shellOverride'),
      shellArguments: atom.config.get('term3.shellArguments'),
      titleTemplate: atom.config.get('term3.titleTemplate'),
      cursorBlink: atom.config.get('term3.cursorBlink'),
      fontFamily: atom.config.get('term3.fontFamily'),
      fontSize: atom.config.get('term3.fontSize'),
      colors: getColors(),
      forkPTY,
      rows,
      cols,
    };

    if (opts.shellOverride) {
      opts.shell = opts.shellOverride;
    } else {
      opts.shell = process.env.SHELL || 'bash';
    }

    const editorPath = keypather.get(
      atom,
      'workspace.getEditorViews[0].getEditor().getPath()',
    );
    opts.cwd =
      opts.cwd || atom.project.getPaths()[0] || editorPath || process.env.HOME;

    const termView = new TermView(opts);
    const model = store.addTerminal({
      local: !!forkPTY,
      term: termView,
      title,
    }).terminal;
    const { id } = model;
    termView.id = id;

    termView.onExit(() => this.handleRemoveTerm(termView));

    termView.on('click', () => {
      // get focus in the terminal
      // avoid double click to get focus
      return termView.focus();
    });

    termView.onDidChangeTitle(function() {
      let newTitle = null;
      if (forkPTY) {
        newTitle = termView.getTitle();
      } else {
        newTitle = title + '-' + termView.getTitle();
      }
      return store.updateTerminal({ id: termView.id, title: newTitle });
    });

    termView.onFocus(() => (this.focusedTerminal = termView));

    if (typeof this.termViews.push === 'function') {
      this.termViews.push(termView);
    }
    process.nextTick(() => this.emitter.emit('term', termView));
    return termView;
  },

  splitTerm(direction) {
    let pane;
    const openPanesInSameSplit = atom.config.get('term3.openPanesInSameSplit');
    const termView = this.createTermView();
    direction = capitalize(direction);

    const splitter = () => {
      pane = activePane[`split${direction}`]({ items: [termView] });
      activePane.termSplits[direction] = pane;
      this.focusedTerminal = [pane, pane.items[0]];
    };

    var activePane = atom.workspace.getActivePane();
    if (!activePane.termSplits) {
      activePane.termSplits = {};
    }
    if (openPanesInSameSplit) {
      if (
        activePane.termSplits[direction] &&
        activePane.termSplits[direction].items.length > 0
      ) {
        pane = activePane.termSplits[direction];
        const item = pane.addItem(termView);
        pane.activateItem(item);
        this.focusedTerminal = [pane, item];
      } else {
        return splitter();
      }
    } else {
      return splitter();
    }
  },

  pipeTerm(action) {
    const editor = atom.workspace.getActiveTextEditor();
    if (!editor) {
      return;
    }
    const stream = (() => {
      switch (action) {
        case 'path':
          return editor.getBuffer().file.path;
        case 'selection':
          return editor.getSelectedText();
      }
    })();

    if (stream && this.focusedTerminal) {
      let item;
      if (Array.isArray(this.focusedTerminal)) {
        let pane;
        [pane, item] = Array.from(this.focusedTerminal);
        pane.activateItem(item);
      } else {
        item = this.focusedTerminal;
      }

      item.input(stream.trim());
      return item.focus();
    }
  },

  handleRemoveTerm(termView) {
    store.removeTerminal(termView);
    this.termViews.splice(this.termViews.indexOf(termView), 1);
  },

  deactivate() {
    this.termViews.forEach(view => view.exit());
    this.termViews = [];
    this.disposables.dispose();
  },

  deserializeTermView() {
    return this.createTermView();
  },
};
