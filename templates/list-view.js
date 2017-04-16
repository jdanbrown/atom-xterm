/** @jsx React.DOM */
/* global HTMLElement */
"use strict";

var React = require("react-atom-fork");
var store = require("../store");

var TerminalView = React.createClass({
  propTypes: {
    terminal: React.PropTypes.object.isRequired,
  },
  onMouseDown: function () {
    this.props.terminal.open();
  },
  render: function () {
    const t = this.props.terminal;
    return (
      <li onMouseDown={this.onMouseDown.bind(this, t.id)}>
        <i className="icon icon-terminal"></i>
        tty-{t.title}
      </li>
    );
  }
});

function mapStateToProps(state) {
  return {
    terminals: state.terminals,
  };
}

var ListView = React.createClass({
  propTypes: {
    terminals: React.PropTypes.array.isRequired,
  },
  getInitialState: function () {
    return ({ terminals: store.getState().terminals });
  },
  componentWillMount: function () {
    var that = this;
    this.unsubscribeStore = store.subscribe(function () {
      that.setState({
        terminals: store.getState().terminals,
      })
    });
  },
  componentWillUnmount: function () {
    if (typeof this.unsubscribeStore === 'function') {
      this.unsubscribeStore();
    }
  },
  render: function () {
    // XXXX: Horrible hack to work around a bug in Atom. Sometimes, Atom will erase NODE_ENV when run from the command line
    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = "production";
    }
    const terminals = this.state.terminals;
    if (terminals == null || !terminals.length) {
      return (<div></div>);
    }
    const terms = terminals.map(function (t) {
      return (<TerminalView terminal={t} key={t.id} />);
    });
    return (
      <div className="header">
        <span className=""><i className="icon icon-terminal"></i>terminals</span>
        <ul>
          {terms}
        </ul>
      </div>
    );
  }
});

const HTMLElementProto = Object.create(HTMLElement.prototype);

// HTMLElementProto.createdCallback = function () {
//   return;
// };

HTMLElementProto.attachedCallback = function () {
  this.reactNode =
    React.renderComponent(ListView({ store: store }), this);
};

// HTMLElementProto.attributeChangedCallback = function (attrName, oldVal, newVal) {
//   return;
// };

// HTMLElementProto.detachedCallback = function () {
//   return;
// };

module.exports = document.registerElement('terminal-list-view', {prototype: HTMLElementProto});
