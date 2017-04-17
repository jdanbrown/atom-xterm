'use babel';

import { createStore, combineReducers } from 'redux';

const ADD_TERMINAL = 'TERMINALS/ADD';
const UPDATE_TERMINAL = 'TERMINALS/UPDATE';
const REMOVE_TERMINAL = 'TERMINALS/REMOVE';

class AutoIncrement {
  nextInt = 1;

  next() {
    let out = this.nextInt;
    this.nextInt += 1;
    return out;
  }
}

const idCounter = new AutoIncrement();

export function addTerminal(terminal) {
  terminal.open = function() {
    this.term.focusPane();
  };
  terminal.id = idCounter.next();
  return {
    type: ADD_TERMINAL,
    terminal,
  };
}

export function updateTerminal(terminal) {
  if (terminal.id == null) {
    throw new Error('terminal update must include id');
  }
  return {
    type: UPDATE_TERMINAL,
    terminal,
  };
}

export function removeTerminal(terminal) {
  return {
    type: REMOVE_TERMINAL,
    terminal,
  };
}

function terminals(state = [], action) {
  const t = action.terminal;
  switch (action.type) {
    case ADD_TERMINAL: {
      if (state.find(u => u.id === t.id)) return state;
      const newState = state.slice();
      newState.push(t);
      return newState;
    }

    case UPDATE_TERMINAL:
      return state.map(u => {
        if (u.id === t.id) {
          return Object.assign({}, u, t);
        } else {
          return u;
        }
      });

    case REMOVE_TERMINAL:
      return state.filter(u => u.id !== t.id);

    default:
      return state;
  }
}

const reducer = combineReducers({ terminals });

var store = createStore(reducer, {});

store.addTerminal = terminal => store.dispatch(addTerminal(terminal));
store.updateTerminal = terminal => store.dispatch(updateTerminal(terminal));
store.removeTerminal = terminal => store.dispatch(removeTerminal(terminal));

module.exports = store;
