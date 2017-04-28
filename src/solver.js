import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import { coef, coefMultScalar } from './program';
import { mapVars, varToTex, coefToTex } from './fmt';
import { ConstraintView, ProgramView } from './program';
import { TableauView } from './tableau';

const MAX_ITER = 10; // XXX

const How = (props) => <div style={{'borderLeft': '3px solid red'}}>{props.children}</div>;

export const standardizeProgram = (oldP) => {
  var p = Object.assign({}, oldP, {cons: []});
  const nextVar = (prefix) => {
    for (let i = 1;; i++) {
      var name = prefix+i;
      if (p.vars[name] === undefined)
        return name;
    }
  };
  const registerVar = (name, restriction) => {
    p.vars = {
      ...p.vars,
      [name]: restriction,
    };
  };
  oldP.cons.forEach((con) => {
    p.cons.push((({rel, exp, rhs}) => {
      switch (rel) {
        case '<=':
          const e = nextVar('e');
          registerVar(e, 'non-negative');
          return {exp: {...exp, [e]: {num: 1, denom: 1}}, rel: '=', rhs};
        case '>=':
          const s = nextVar('s');
          registerVar(s, 'non-negative');
          return {exp: {...exp, [s]: {num: 1, denom: 1}}, rel: '=', rhs};
        case '=':
          return {exp, rel, rhs};
        case '<': case '>':
          throw new Error(`don't know how to standardize '${rel}' constraints`);
        default:
          throw new Error(`unknown relation: ${rel}`);
      }
    })(con));
  });
  return {
    result: {
      ...p,
      type: 'stdprogram',
    },
    what: 'Convert to standard form',
    how: <div>
      <p>To turn a program into standard form, we must turn all inequalities into equalities. This is accomplished by adding excess variables like so:</p>

      <ul>{p.cons.map((newCon, idx) => (
        <li key={idx}>
          <ConstraintView con={oldP.cons[idx]} vars={Object.keys(p.vars)} />
          &nbsp;becomes&nbsp;
          <ConstraintView con={newCon} vars={Object.keys(p.vars)} />
        </li>
      ))}</ul>
    </div>,
    view: <ProgramView program={p} />,
  };
};

export const standardProgramToTableau = (p) => {
  // XXX vars restrictions?
  p.cons.forEach(con => {
    if(con.rel !== '=')
      throw new Error(`tableau not in standard form, found: ${con.rel}`);
  });
  const tableau = {
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
  return {
    result: {
      ...tableau,
      type: 'unknowntableau',
    },
    what: 'convert to tableau',
    how: 'by doing stuff',
    view: <TableauView tableau={tableau} />
  };
};

export const tableauIsOptimal = (t) => {
  let varsOfInterest = {...t.rows[0]};
  delete varsOfInterest[t.vars[0]];
  delete varsOfInterest['rhs'];

console.log(varsOfInterest);
  const negatives = Object.values(varsOfInterest).filter(x => x.num < 0 && (x.num >= 0 ^ x.denom >= 0));
  const isOptimal = negatives.length === 0;

  return {
    result: isOptimal,
    what: 'Check if the tableau is optimal',
    how: <How>
      <div>A max tableau is optimal when all reduced costs (row-0 values) are <InlineMath>\geq 0</InlineMath>.</div>
      <div>We take the row-0 values from the given tableau:</div>
      <TableauView tableau={t} row={0} />
      <div>Which gives us:
        <BlockMath>{mapVars(varsOfInterest, t.vars, (name, val) => varToTex(name)+' = '+coefToTex(val), true).join(', ')}</BlockMath>
      </div>
      {isOptimal ? (
        <div>All values are <InlineMath>\geq 0</InlineMath>, so the current tableau is optimal!</div>
      ) : (
        <div>We still have negative values (<InlineMath>{negatives.map(coefToTex).join(', ')}</InlineMath>), so we are not yet optimal.</div>
      )}
    </How>,
    view: isOptimal ? 'Yes' : 'No',
  };
};

const conversions = [
  {from: 'program', to: 'stdprogram', cb: standardizeProgram},
  {from: 'stdprogram', to: 'unknowntableau', cb: standardProgramToTableau},
  {from: 'unknowntableau', to: 'tableau', cb: tableauIsOptimal},
  {from: 'tableau', to: 'bfstableau', cb: (x) => ({result: x, what: 'nothing', how: 'assumed'})},
  {from: 'bfstableau', to: 'optimaltableau', cb: (x) => ({result: x, what: 'nothing', how: 'assumed'})},
];

export const reachableFrom = (now) => conversions.filter(c => c.from === now);

// XXX could be optimized
const _findConversionChain = (paths, end) => {
  for (let path of paths) {
    if (path[path.length-1].to === end)
      return path;
  }
  let nextPaths = [];
  for (let path of paths) {
    reachableFrom(path[path.length-1].to)
    .filter(next => !path.includes(next))
    .forEach(next => nextPaths.push([...path, next]));
  }
  if (nextPaths.length === 0) {
    // XXX what's the right thing to do?
    throw new Error(`No path from '${paths[0][0].from}' to '${end}'`);
    //return undefined;
  }
  return _findConversionChain(nextPaths, end);
};
export const findConversionChain = (start, end) => {
  if (start === end)
    return [];
  return _findConversionChain([reachableFrom(start)], end).map(x => x.cb);
};

export const convertTo = (obj, to) => {
  let steps = [];
  for (let count = 0; obj.type !== to && obj.type !== undefined && count < MAX_ITER; count++) {
    const callback = findConversionChain(obj.type, to)[0];
    let nextStep = callback(obj);
    nextStep.stepName = callback.name;
    steps.push(nextStep);
    obj = nextStep.result;
  }
  return steps;
};

window.s = {
  conversions,
  reachableFrom,
  _findConversionChain,
  findConversionChain,
  convertTo,

  standardizeProgram,
  standardProgramToTableau,
};
