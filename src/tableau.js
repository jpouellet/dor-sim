import React from 'react';
import PropTypes from 'prop-types';
import { InlineMath } from 'react-katex';
import { varToTex, mapVars, coefToString } from './fmt';
import { coef, coefCmp, coefDiv } from './program';

/*
const example_program = {
  "type": "program",
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
  "type": "tableau",
  "minmax": "max",
  "origObjFn": {
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

export const getBasicVars = (t) => (
  // for each row:
  t.rows.map((row, rowIdx) => (
    // find the (non-rhs) var where:
    t.vars.filter(x => x !== 'rhs').find(varName => {
      // this row is a 1
      const thisIsOne = coefCmp(row[varName], coef(1)) === 0;
      // all other rows...
      const otherRows = [...t.rows.slice(0, rowIdx), ...t.rows.slice(rowIdx+1)];
      const othersAreZero = otherRows.every(zeroRow => (
        // ...are zeroes
        coefCmp(zeroRow[varName], coef(0)) === 0
      ));
      return thisIsOne && othersAreZero;
    })
  ))
);

export const getRatios = (t, enteringVarName) => (
  t.rows.map(row => {
    const ec /* entering column */ = row[enteringVarName];
    if (coefCmp(ec, coef(0)) <= 0)
      return coef(Infinity);
    return coefDiv(row['rhs'], ec);
  })
);

export const TableauView = (props) => {
  const tableau = props.tableau;
  const selectedCol = props.col !== undefined ? props.col : tableau.enteringVar;
  const selectedRow = props.row !== undefined ? props.row : tableau.leavingRowNum;
  const showRatios = props.showRatios !== undefined;
  const showBasics = showRatios;
  const ops = tableau.ops;

  let basics, ratios;
  if (showBasics)
    basics = getBasicVars(tableau);
  if (showRatios)
    ratios = getRatios(tableau, tableau.enteringVar);

  return <table className="tableau">
    <thead>
      <tr>
        <td key=":minmax">{tableau.minmax}</td>
        {tableau.vars.map(name =>
          <th className={'tableau-cell'+(name === selectedCol ? ' col-selected' : '')} key={name}>
            <InlineMath>{varToTex(name)}</InlineMath>
          </th>
        )}
        {showBasics && <th key=":basic var">Basic var</th>}
        {showRatios && <th key=":ratio">Ratio</th>}
      </tr>
    </thead>
    <tbody>
      {tableau.rows.map((row, idx) => (
        <tr key={idx} className={idx === selectedRow ? 'row-selected' : ''}>
          <td key=":row-op">{ops && ops[idx] && `R${idx} <= R${idx} + ${coefToString(ops[idx].scale)} * R${ops[idx].row}`}</td>
          {mapVars(row, tableau.vars, (name, val) =>
            <td className={'tableau-cell'+(name === selectedCol ? ' col-selected' : '')} key={name}>
              {coefToString(val)}
            </td>
          )}
          {showBasics && <td key=":basic var">{basics[idx]}</td>}
          {showRatios && <td key=":ratio">{coefToString(ratios[idx])}</td>}
        </tr>
      ))}
    </tbody>
  </table>
};
TableauView.propTypes = {
  tableau: PropTypes.object.isRequired,
  col: PropTypes.string,
  row: PropTypes.number,
};

window.t = {
  getBasicVars,
  getRatios,
};
