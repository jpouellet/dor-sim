import React from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import { createStore } from 'redux';
import { Provider, connect } from 'react-redux';
import { parseProgram, standardizeProgram, ProgramView } from './program';
import { TableauView } from './tableau';
//import * as Tableau from './tableau';
//import TableauView from './TableauView';
import './index.css';
import '../node_modules/katex/dist/katex.css';

let ProgramEditor = ({ editor, onChange }) => {
  return (
    <div className={'program-editor '+(editor.parseError?'in':'')+'valid'}>
      <textarea
        onChange={e => onChange(e.target.value)}
        value={editor.text} />
      <span className="error-message">
        {editor.parseError ? editor.parseError : 'Program valid'}
      </span>
    </div>
  );
};
ProgramEditor.propTypes = {
  editor: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired
};

const initialState = (() => {
  const text = `max z = 60x1 + 30x2 + 20x3
8x1 + 6x2 + x3 <= 48
4x1 + 2x2 + 3/2x3 <= 20
2x1 + 3/2x2 + 1/2x3 <= 8
x2 <= 5
x1, x2, x3 non-negative`;
  const program = parseProgram(text);
  return {
    editor: {
      text,
      program,
      parseError: null,
    },
  };
})();

function reducer(state = initialState, action) {
  console.log('----- action -----');
  console.log(action);
  switch (action.type) {
  case 'CHANGE_PROGRAM':
    const text = action.text;
    let parseError = null;
    let program = null;
    try {
      program = parseProgram(text);
    } catch (e) {
      parseError = e.message;
    }
    return {
      ...state,
      editor: {
        text,
        parseError,
        program,
      },
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
    editor: state.editor,
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

const render = () => {
  ReactDOM.render(
    <Provider store={store}>
      <div>
        <ProgramEditor />
        {store.getState().editor.program && (
          <ProgramView program={store.getState().editor.program} />
        )}
        {store.getState().editor.program && (
          <ProgramView program={standardizeProgram(store.getState().editor.program)} />
        )}
        {store.getState().editor.program && (
          <TableauView />
        )}
      </div>
    </Provider>,
    document.getElementById('root')
  );
};
render();
store.subscribe(render);
