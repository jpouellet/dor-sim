import React from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import { createStore } from 'redux';
import { Provider, connect } from 'react-redux';
import { parseProgram, isProgram } from './program';
//import * as Tableau from './tableau';
//import TableauView from './TableauView';
import './index.css';

let ProgramEditor = ({ program, onChange }) => {
  return (
    <textarea
      onChange={e => onChange(e.target.value)}
      style={{
        backgroundColor: isTableau(program) ? 'green' : 'red',
        height: '8em',
        width: '16em',
      }}
    >{program}</textarea>
  );
};
ProgramEditor.propTypes = {
  program: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired
};

const TableauView = ({ tableau }) => (
  <table>
    <thead>
      <tr>
        {Object.keys(tableau.vars).map(varName =>
          <th key={varName}>{varName}</th>
        )}
      </tr>
    </thead>
    <tbody>
    </tbody>
  </table>
);
ProgramEditor.propTypes = {
  tableau: PropTypes.object.isRequired,
};

function reducer(state = {program: 'max z = x1 + 2x2\nx1 + x2 < 3\nx1, x2 unrestricted'}, action) {
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

function mapStateToTableauViewProps(state) {
  return {
    program: parseProgram(state.program),
  };
}
let MyTableauView = connect(
  mapStateToTableauViewProps,
  null,
)(TableauView);

ReactDOM.render(
  <Provider store={store}>
    <div>
      <ProgramEditor />
      <MyTableauView />
    </div>
  </Provider>,
  document.getElementById('root')
);
