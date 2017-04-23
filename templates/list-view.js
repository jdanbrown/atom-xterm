/** @jsx React.DOM */
/* global HTMLElement */
'use strict';

var React = require('react-atom-fork');
var store = require('../store');

var TerminalView = React.createClass({
  propTypes: {
    terminal: React.PropTypes.object.isRequired,
    selected: React.PropTypes.bool,
  },

  onMouseDown: function(e) {
    e.stopPropagation();
    this.props.terminal.open();
  },

  render: function() {
    const t = this.props.terminal;
    const sel = this.props.selected;
    return (
      <li
        onMouseDown={this.onMouseDown.bind(this)}
        className={(sel ? 'selected' : '') + ' list-item'}
      >
        <span className="icon icon-terminal">{t.title}</span>
      </li>
    );
  },
});

var ListView = React.createClass({
  propTypes: {
    terminals: React.PropTypes.array.isRequired,
  },

  getInitialState: function() {
    return { terminals: store.getState().terminals };
  },

  componentWillMount: function() {
    var that = this;
    this.unsubscribeStore = store.subscribe(function() {
      const { terminals, selectedTerminalId } = store.getState();
      that.setState({
        terminals,
        selectedTerminalId,
      });
    });
  },

  componentWillUnmount: function() {
    if (typeof this.unsubscribeStore === 'function') {
      this.unsubscribeStore();
    }
  },

  toggleCollapse: function() {
    const { collapsed } = this.state;
    this.setState({ collapsed: !collapsed });
  },

  render: function() {
    // XXXX: Horrible hack to work around a bug in Atom. Sometimes, Atom will erase NODE_ENV when run from the command line
    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = 'production';
    }
    const { terminals, selectedTerminalId, collapsed } = this.state;
    if (terminals == null || !terminals.length) {
      return <div />;
    }
    const terms = terminals.map(function(t) {
      return (
        <TerminalView
          terminal={t}
          selected={t.id === selectedTerminalId}
          key={t.id}
        />
      );
    });
    return (
      <ol className="list-tree has-collapsable-children">
        <li
          className={`list-nested-item project-root ${collapsed ? 'collapsed' : 'expanded'}`}
        >
          <div
            className="header list-item project-root-header"
            onClick={this.toggleCollapse.bind(this)}
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

HTMLElementProto.attachedCallback = function() {
  this.reactNode = React.renderComponent(ListView({ store: store }), this);
};

// HTMLElementProto.attributeChangedCallback = function (attrName, oldVal, newVal) {
//   return;
// };

// HTMLElementProto.detachedCallback = function () {
//   return;
// };

module.exports = document.registerElement('terminal-list-view', {
  prototype: HTMLElementProto,
});
