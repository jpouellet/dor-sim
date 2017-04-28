import React from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import { createStore } from 'redux';
import { Provider } from 'react-redux';
import { parseProgram, ProgramEditor } from './program';
import { convertTo } from './solver';
import './index.css';
import '../node_modules/katex/dist/katex.css';

const CLEAN_WORKING_URL = window.location.origin !== 'http://localhost:3000';

const encodeProgramLink = btoa;
const decodeProgramLink = atob;

const defaultProgram = `max z = 60x1 + 30x2 + 20x3
8x1 + 6x2 + x3 <= 48
4x1 + 2x2 + 3/2x3 <= 20
2x1 + 3/2x2 + 1/2x3 <= 8
x2 <= 5
x1, x2, x3 non-negative`;

const hashLoadedProgram = (() => {
  let hash = window.location.hash;

  if (hash === '' || hash === '#')
    return null;

  if (hash.startsWith('#'))
    hash = hash.substring(1);

  return decodeProgramLink(hash);
})();
if (CLEAN_WORKING_URL) {
  window.location.hash = '';
  history.replaceState('', document.title, window.location.pathname + window.location.search);
}

const initialState = (() => {
  const text = hashLoadedProgram || defaultProgram;
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
    if (!CLEAN_WORKING_URL)
      saveStateToURL(text);
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

function saveStateToURL(text) {
  history.replaceState('', document.title, window.location.pathname + window.location.search + '#'+encodeProgramLink(text || store.getState().editor.text));
};

// Save the current state when we navigate away so we restore the same program when re-opening the window.
window.onbeforeunload = function(e) {
  saveStateToURL();
};

let Step = ({step: {what, how, result, view, stepName}}) => (
  <li className={"step "+stepName}><span style={{color: 'red'}}>({stepName})</span> {what}:
    <div className="how">{how}</div>
    Result:&nbsp;
    {view}
  </li>
);
Step.propTypes = {
  step: PropTypes.object.isRequired,
};

let StepList = ({steps, goal}) => (
  <fieldset className="step-list">
    <legend>{goal}</legend>
    <ol>
      {steps.map((step, idx) => (
        <Step key={idx} step={step} />
      ))}
    </ol>
  </fieldset>
);
StepList.propTypes = {
  steps: PropTypes.array.isRequired,
};

const render = () => {
  ReactDOM.render(
    <Provider store={store}>
      <div>
        <div className="ui-input">
          <h3>Input your program:</h3>
          <ProgramEditor />
          <label>
            Shareable link to your program:&nbsp;
            <input
              type="text"
              value={window.location.href.split('#')[0]+'#'+encodeProgramLink(store.getState().editor.text)}
              onChange={() => {}}
              onFocus={(e) => {e.target.select();}}
              readOnly />
          </label>
        </div>
        {store.getState().editor.program && <StepList className="ui-steps" goal="Optimize the tableau" steps={convertTo(store.getState().editor.program, 'tableau')} />}
      </div>
    </Provider>,
    document.getElementById('root')
  );
};
render();
if (!CLEAN_WORKING_URL)
  saveStateToURL();
store.subscribe(render);

window.gs = store.getState; // XXX remove me!
