import React from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import { createStore } from 'redux';
import { Provider, connect } from 'react-redux';
import { parseProgram, isProgram, programToString, standardizeProgram } from './program';
import { TableauView } from './tableau';
//import * as Tableau from './tableau';
//import TableauView from './TableauView';
import './index.css';

let ProgramEditor = ({ program, onChange }) => {
  return (
    <textarea
      onChange={e => onChange(e.target.value)}
      style={{
        backgroundColor: isProgram(program) ? 'green' : 'red',
        height: '8em',
        width: '16em',
      }}
      value={program} />
  );
};
ProgramEditor.propTypes = {
  program: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired
};

function reducer(state = {program: 'max z = x1 + 2x2\nx1 + x2 <= 3\nx1, x2 non-negative'}, action) {
  console.log(action);
  switch (action.type) {
  case 'CHANGE_PROGRAM':
    return {
      ...state,
      program: action.text,
    };

  default:
    return state;
  }
}

const store = createStore(
  reducer,
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
);

function mapStateToProgramEditorProps(state) {
  return {
    program: state.program,
  };
}
function mapDispatcherToProgramEditorProps(dispatch) {
  return {
    onChange: (text) => dispatch({
      type: 'CHANGE_PROGRAM',
      text,
    })
  };
}
ProgramEditor = connect(
  mapStateToProgramEditorProps,
  mapDispatcherToProgramEditorProps
)(ProgramEditor);

const ProgramView = ({program}) => (
  <pre>{programToString(program)}</pre>
);
ProgramView.propTypes = {
  program: PropTypes.object.isRequired,
};

const render = () => {
  ReactDOM.render(
    <Provider store={store}>
      <div>
        <ProgramEditor />
        <ProgramView program={parseProgram(store.getState().program)} />
        <ProgramView program={standardizeProgram(parseProgram(store.getState().program))} />
        <TableauView />
      </div>
    </Provider>,
    document.getElementById('root')
  );
};
render();
store.subscribe(render);
