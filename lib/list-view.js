'use babel';

/* global HTMLElement */

import store from './store';

const React = require('react-atom-fork');

React.createElement = function createElement(name, attrs, ...children) {
  const fn = React.DOM[name];
  if (fn == null) {
    return name(attrs, ...children);
  }

  return fn(attrs, ...children);
};

/* eslint-disable react/prefer-es6-class */
const TerminalView = React.createClass({
  propTypes: {
    terminal: React.PropTypes.object.isRequired,
    selected: React.PropTypes.bool.isRequired,
  },

  onMouseDown(e) {
    e.stopPropagation();
    this.props.terminal.open();
  },

  render() {
    const t = this.props.terminal;
    const sel = this.props.selected;
    return (
      <li
        onMouseDown={this.onMouseDown}
        className={`${sel ? 'selected' : ''} list-item`}
      >
        <span className="icon icon-terminal">{t.title}</span>
      </li>
    );
  },
});

/* eslint-disable react/prefer-es6-class, react/no-multi-comp */
const ListView = React.createClass({
  propTypes: {
    terminals: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
  },

  getInitialState() {
    return { terminals: store.getState().terminals };
  },

  componentWillMount() {
    const that = this;
    this.unsubscribeStore = store.subscribe(() => {
      const { terminals, activeTerminalId } = store.getState();
      that.setState({
        terminals,
        activeTerminalId,
      });
    });
  },

  componentWillUnmount() {
    if (typeof this.unsubscribeStore === 'function') {
      this.unsubscribeStore();
    }
  },

  toggleCollapse() {
    const { collapsed } = this.state;
    this.setState({ collapsed: !collapsed });
  },

  render() {
    // XXXX: Horrible hack to work around a bug in Atom. Sometimes, Atom will
    // erase NODE_ENV when run from the command line
    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = 'production';
    }
    const { terminals, activeTerminalId, collapsed } = this.state;
    if (terminals == null || !terminals.length) {
      return <div />;
    }
    const terms = terminals.map(t => (
      <TerminalView
        terminal={t}
        selected={t.id === activeTerminalId}
        key={t.id}
      />
    ));
    return (
      <ol className="list-tree has-collapsable-children">
        <li
          className={`list-nested-item project-root ${collapsed ? 'collapsed' : 'expanded'}`}
        >
          <div
            className="header list-item project-root-header"
            role="menuitem"
            onClick={this.toggleCollapse}
          >
            <span className="name icon icon-terminal">terminals</span>
          </div>
          <ol className="entries list-tree">
            {terms}
          </ol>
        </li>
      </ol>
    );
  },
});

const HTMLElementProto = Object.create(HTMLElement.prototype);

// HTMLElementProto.createdCallback = function () {
//   return;
// };

HTMLElementProto.attachedCallback = function attachedCallback() {
  // eslint-disable-next-line react/no-deprecated
  this.reactNode = React.renderComponent(ListView({ store }), this);
};

// HTMLElementProto.attributeChangedCallback = function (attrName, oldVal, newVal) {
//   return;
// };

// HTMLElementProto.detachedCallback = function () {
//   return;
// };

export default document.registerElement('terminal-list-view', {
  prototype: HTMLElementProto,
});
