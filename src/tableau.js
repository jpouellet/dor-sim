import React from 'react';
import PropTypes from 'prop-types';
import { InlineMath } from 'react-katex';
import { connect } from 'react-redux';
import { varToTex, mapVars } from './fmt';
import { standardizeProgram, standardProgramToTableau } from './solver';

/*
const example_program = {
  "obj": {
    "minmax": "max",
    "var": "z",
    "exp": {
      "x1": {
        "num": 1,
        "denom": 1
      },
      "x2": {
        "num": 2,
        "denom": 1
      }
    }
  },
  "cons": [
    {
      "exp": {
        "x1": {
          "num": 1,
          "denom": 1
        },
        "x2": {
          "num": 1,
          "denom": 1
        }
      }
      "rel": "<=",
      "rhs": {
        "num": 3,
        "denom": 1
      }
    }
  ],
  "vars": {
    "x1": "non-negative",
    "x2": "non-negative"
  }
};
*/

/*
const example_tableau = {
  "minmax": "max",
  "vars": [
    "z",
    "x1",
    "x2",
    "e1",
    "e2",
    "rhs"
  ],
  "rows": [
    {
      "z": {
        "num": 1,
        "denom": 1
      },
      "rhs": {
        "num": 0,
        "denom": 1
      },
      "x1": {
        "num": -1,
        "denom": 1
      },
      "x2": {
        "num": -2,
        "denom": 1
      },
      "e1": {
        "num": 0,
        "denom": 1
      },
      "e2": {
        "num": 0,
        "denom": 1
      }
    },
    {
      "z": {
        "num": 0,
        "denom": 1
      },
      "rhs": {
        "num": 3,
        "denom": 1
      },
      "x1": {
        "num": 1,
        "denom": 1
      },
      "x2": {
        "num": 1,
        "denom": 1
      },
      "e1": {
        "num": 0,
        "denom": 1
      },
      "e2": {
        "num": 1,
        "denom": 1
      }
    }
  ]
};
*/

let TableauView = ({ tableau }) => (
  <table className="tableau">
    <thead>
      <tr>
        <td key="minmax">{tableau.minmax}</td>
        {tableau.vars.map(varName =>
          <th className="tableau-cell" key={varName}>
            <InlineMath>{varToTex(varName)}</InlineMath>
          </th>
        )}
      </tr>
    </thead>
    <tbody>
      {tableau.rows.map((row, idx) => (
        <tr key={idx}>
          <td key="row-op"></td>
          {mapVars(row, tableau.vars, (name, val) =>
            <td className="tableau-cell" key={name}>
              {val.num}{val.denom !== 1 ? '/'+val.denom : ''}
            </td>
          )}
        </tr>
      ))}
    </tbody>
  </table>
);
TableauView.propTypes = {
  tableau: PropTypes.object.isRequired,
};

function mapStateToTableauViewProps(state) {
  const program = state.editor.program;
  const stdProgram = standardizeProgram(program).result;
  const tableau = standardProgramToTableau(stdProgram).result;

  return {
    tableau: tableau,
  };
}
TableauView = connect(
  mapStateToTableauViewProps,
  null,
)(TableauView);

export { TableauView };
