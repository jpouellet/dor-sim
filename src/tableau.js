import React from 'react';
import PropTypes from 'prop-types';
import { InlineMath } from 'react-katex';
import { connect } from 'react-redux';
import { standardizeProgram, coef, coefMultScalar } from './program';
import { varToTex, relToTex, coefToTex } from './fmt';

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

export const mapVars = (exp, vars, fn, onlyDefined) => {
  let varList;
  if (Array.isArray(vars))
    varList = vars;
  else
    varList = Object.keys(vars);
  if (onlyDefined)
    varList = varList.filter(varName => exp[varName] !== undefined);
  return varList.map(varName => fn(varName, exp[varName]));
};

const standardProgramToTableau = (p) => {
  // XXX vars restrictions?
  p.cons.forEach(con => {
    if(con.rel !== '=')
      throw new Error(`tableau not in standard form, found: ${con.rel}`);
  });
  return {
    minmax: p.obj.minmax,
    vars: [p.obj.var, ...Object.keys(p.vars), 'rhs'],
    rows: [
      Object.assign({[p.obj.var]: coef(1), rhs: coef(0)},
        ...mapVars(p.obj.exp, p.vars, (name, val) => ({
          [name]: val ? coefMultScalar(val, -1) : coef(0),
        }))
      ),
      ...p.cons.map(con => (
        Object.assign({[p.obj.var]: coef(0), rhs: con.rhs},
          ...mapVars(con.exp, p.vars, (name, val) => ({
            [name]: val || coef(0),
          }))
        )
      )),
    ],
  };
};

let TableauView = ({ tableau }) => (
  <table className="tableau">
    <thead>
      <tr>
        {tableau.vars.map(varName =>
          <th key={varName}><InlineMath>{varToTex(varName)}</InlineMath></th>
        )}
      </tr>
    </thead>
    <tbody>
      {tableau.rows.map((row, idx) => (
        <tr key={idx}>
          {mapVars(row, tableau.vars, (name, val) =>
            <td key={name}>{val.num}{val.denom !== 1 ? '/'+val.denom : ''}</td>
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
  const stdProgram = standardizeProgram(program);
  const tableau = standardProgramToTableau(stdProgram);

  return {
    tableau: tableau,
  };
}
TableauView = connect(
  mapStateToTableauViewProps,
  null,
)(TableauView);

export { TableauView };
