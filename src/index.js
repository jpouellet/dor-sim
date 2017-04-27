import React from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import { createStore } from 'redux';
import { Provider } from 'react-redux';
import { parseProgram, ProgramEditor } from './program';
import { convertTo } from './solver';
import './index.css';
import '../node_modules/katex/dist/katex.css';

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

let Step = ({step: {what, how, result, view}}) => (
  <li className="step">{what}: {view}
    {how}
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
        </div>
        <StepList className="ui-steps" goal="Optimize the tableau" steps={convertTo(store.getState().editor.program, 'tableau')} />
      </div>
    </Provider>,
    document.getElementById('root')
  );
};
render();
store.subscribe(render);
