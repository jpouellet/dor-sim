import React from 'react';
import PropTypes from 'prop-types';
import { InlineMath, BlockMath } from 'react-katex';
import { coef, coefMultScalar, ObjectiveView } from './program';
import { mapVars, varToTex, coefToTex, polyToTex } from './fmt';
import { coefCmp, coefNeg, coefRecip, polyMultCoef, polyAdd, ConstraintView, ProgramView } from './program';
import { getBasicVars, getRatios, TableauView } from './tableau';

const MAX_ITER = 100; // XXX

const How = (props) => <div>{props.children}</div>;

export const Step = ({step: {what, how, result, view, stepName}}) => (
  <li className={"step "+stepName}><span className="step-fn">{stepName && `(${stepName})`}</span> {what}:
    {how && <div className="how">{how}</div>}
    {how && view && 'Result: '}
    {view}
  </li>
);
Step.propTypes = {
  step: PropTypes.object.isRequired,
};

export const StepList = ({steps}) => (
  <ol className="step-list">
    {steps.map((step, idx) => (
      <Step key={idx} step={step} />
    ))}
  </ol>
);
StepList.propTypes = {
  steps: PropTypes.array.isRequired,
};

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
    how: <How>
      <p>To turn a program into standard form, we must turn all inequalities into equalities. This is accomplished by adding excess variables like so:</p>

      <ul>{p.cons.map((newCon, idx) => (
        <li key={idx}>
          <ConstraintView con={oldP.cons[idx]} vars={Object.keys(p.vars)} />
          &nbsp;becomes&nbsp;
          <ConstraintView con={newCon} vars={Object.keys(p.vars)} />
        </li>
      ))}</ul>
    </How>,
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
    origObjFn: p.obj,
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
    what: 'Represent the program with a tableau',
    how: <How>
      <p> Tableaus can only have constants on the right, so we must first turn the objective function into a suitable equation.</p>
      <BlockMath>{varToTex(...p.obj.var)+' = '+polyToTex(p.obj.exp, p.vars, true)}</BlockMath>
      <p>becomes</p>
      <BlockMath>{polyToTex({...tableau.rows[0], z: coef(1)}, ['z', ...Object.keys(p.vars)], true)+' = 0'}</BlockMath>
      <p>which forms the top row of our tableau.</p>
    </How>,
    view: <TableauView tableau={tableau} />,
  };
};

export const findBasicFeasibleSolution = (t) => {
  return {
    result: {
      ...t,
      type: 'bfstableau',
    },
    what: 'Find a basic feasible solution',
    /* XXX */how: <How>
      <p>
        A feasible solution has as many basic variables as it has constraints.
        In this case we start by adding excess variables,
        so those are assumed to be our initial basic variables.
      </p>
    </How>,
    view: <span>Tableau is already feasible.</span>,
  };
};

export const tableauIsOptimal = (t) => {
  let varsOfInterest = {...t.rows[0]};
  delete varsOfInterest[t.vars[0]];
  delete varsOfInterest['rhs'];

  const negatives = Object.values(varsOfInterest).filter(x => x.num < 0 && (x.num >= 0 ^ x.denom >= 0));
  const isOptimal = negatives.length === 0;

  return {
    result: {
      ...t,
      isOptimal,
      type: 'optimality-info',
    },
    what: 'Check if the tableau is optimal',
    how: <How>
      <div>A max tableau is optimal when all reduced costs (row-0 values) are <InlineMath>\geq 0</InlineMath>.</div>
      <div>We take the row-0 values from the given tableau:</div>
      <TableauView tableau={t} row={0} />
      <div>Which gives us:
        {mapVars(varsOfInterest, t.vars, (name, val) => (
          <BlockMath key={name}>
            {varToTex(name)+' = '+coefToTex(val)}
          </BlockMath>
        ), true, true)}
      </div>
      {isOptimal ? (
        <div>All values are <InlineMath>\geq 0</InlineMath>, so the current tableau is optimal!</div>
      ) : (
        <div>We still have negative values (<InlineMath>{negatives.map(coefToTex).join(', ')}</InlineMath>), so we are not yet optimal.</div>
      )}
    </How>,
    view: isOptimal ? 'At optimal solution!' : 'Not yet optimal, we need to perform another iteration of the algorithm.',
  };
};

export const pickEnteringVariable = (t) => {
  let varsOfInterest = {...t.rows[0]};
  const objectiveName = t.vars[0];
  delete varsOfInterest[objectiveName];
  delete varsOfInterest['rhs'];

  const negatives = mapVars(t.rows[0], varsOfInterest,
    (name, val) => ([name, val])
  ).filter(
    ([name, val]) => coefCmp(val, coef(0)) < 0
  );
  const isOptimal = negatives.length === 0;

  const [smallestName, smallestVal] = negatives.reduce((acc, cur) => (
    (acc[0] === undefined || coefCmp(cur[1], acc[1]) < 0) ? cur : acc
  ), [undefined, undefined]);

  return {
    result: isOptimal ? {
      ...t,
      type: 'optimaltableau',
    } : {
      ...t,
      enteringVar: smallestName,
      type: 'enteringtableau',
    },
    what: 'Try to find an entering variable',
    how: <How>
      <p>The entering variable for a maximization problem is variable with the most-negative reduced cost (row-0 value).</p>

      <p>We take the row-0 values from the given tableau: (ignoring <InlineMath>{varToTex(objectiveName)}</InlineMath> and <InlineMath>rhs</InlineMath>)</p>
      <TableauView tableau={t} row={0} />

      <p>to obtain the following reduced costs:</p>

      <div>
        {mapVars(varsOfInterest, t.vars, (name, val) => (
          <BlockMath key={name}>
            {varToTex(name)+' = '+coefToTex(val)}
          </BlockMath>
        ), true, true)}
      </div>

      {isOptimal ? (
        <p>In this case reduced costs are actually <InlineMath>\geq 0</InlineMath>, so the current tableau is optimal!</p>
      ) : (
        <div>
          <p>We still have negative values (<InlineMath>{negatives.map(([name, val]) => coefToTex(val)).join(', ')}</InlineMath>), so we are not yet optimal.</p>
          <p>We pick the most negative one (<InlineMath>{varToTex(smallestName)+' = '+coefToTex(smallestVal)}</InlineMath>) as the entering variable.</p>
        </div>
      )}
    </How>,
    view: isOptimal ? 'Already at optimal solution!' : <span><InlineMath>{varToTex(smallestName)}</InlineMath> is the next entering variable.</span>,
  };
};

export const removeProps = (obj, ...props) => {
  let shallowCopy = {...obj};
  for (let prop of props)
    delete shallowCopy[prop];
  return shallowCopy;
};

export const findLeavingVariable = (t) => {
  const basics = getBasicVars(t);
  const ratios = getRatios(t, t.enteringVar);

  const {
    ratio: minRatio,
    basicVar: leavingVar,
    rowNum: leavingRowNum,
  } = ratios.map((ratio, rowIdx) => ({
    ratio: ratio,
    basicVar: basics[rowIdx],
    rowNum: rowIdx,
  })).reduce((acc, cur) => (
    /* XXX: what about ties for smallest? */
    coefCmp(cur.ratio, acc.ratio) < 0 ? cur : acc
  ));

  const isUnbounded = false; /* XXX: detect & handle unbounded! */

  const leaving = {
    ...t,
    leavingVar,
    leavingRowNum,
    type: 'leavingtableau',
  };

  return {
    result: isUnbounded ? {
      ...removeProps(t, 'enteringVar'),
      type: 'unboundedtableau',
    } : leaving,
    what: 'Find the leaving variable',
    how: <How>
      <p>To find the leaving variable, we perform the min-ratio test.</p>

      <p>
        To perform the min-ratio test, we take the rhs value
        (which corresponds to the value of the basic variable for that row)
        and divide it by the value in the entering column of the same row.
        If the denominator is <InlineMath>\leq 0</InlineMath>,
        we set the ratio to <InlineMath>\infty</InlineMath>.
      </p>

      <p>In this case, we get:</p>
      {t.rows.map((row, idx) => (
        <p key={idx}>Row {idx}: <InlineMath>{
          'ratio = '+
          '\\frac{(basic\\ var\\ rhs)}{(entering\\ value)} = '+
          '\\frac{'+basics[idx]+' = '+coefToTex(row['rhs'])+'}'+
                '{'+coefToTex(row[t.enteringVar])+'} \\Rightarrow '+
          coefToTex(ratios[idx])
        }</InlineMath></p>
      ))}

      <p>We keep track of these values in our tableau like so:</p>
      <TableauView tableau={leaving} showRatios={true} />

      <p>The smallest of these values is <InlineMath>{coefToTex(minRatio)}</InlineMath> in the row of basic variable <InlineMath>{varToTex(leavingVar)}</InlineMath>, so <InlineMath>{varToTex(leavingVar)}</InlineMath> is selected to be the leaving variable.</p>
    </How>,
    view: isUnbounded ? 'Unbounded solution!' : <span><InlineMath>{varToTex(leavingVar)}</InlineMath> is the leaving variable.</span>,
  };
};

export const pivot = (t) => {
  const pivotCell = t.rows[t.leavingRowNum][t.enteringVar];
  const pivotRecip = coefRecip(pivotCell);
  const pivotRow = polyMultCoef(t.rows[t.leavingRowNum], pivotRecip);
  const one = {
    ...t,
    rows: [
      ...t.rows.slice(0, t.leavingRowNum),
      pivotRow,
      ...t.rows.slice(t.leavingRowNum + 1),
    ],
    ops: [
      ...t.rows.slice(0, t.leavingRowNum).map(_ => undefined),
      {scale: pivotRecip, row: t.leavingRowNum},
      ...t.rows.slice(t.leavingRowNum + 1).map(_ => undefined),
    ]
  };

  const needsScaling = (row) => row[t.enteringVar].num !== 0;
  const getCoef = (row) => coefNeg(row[t.enteringVar]);
  const performScale = (row) => needsScaling(row) ? polyAdd(row, polyMultCoef(pivotRow, getCoef(row))) : row;
  const describeScale = (row) => needsScaling(row) ? {scale: getCoef(row), 'row': t.leavingRowNum} : undefined;

  const rest = {
    ...t,
    rows: [
      ...t.rows.slice(0, t.leavingRowNum).map(performScale),
      pivotRow,
      ...t.rows.slice(t.leavingRowNum + 1).map(performScale),
    ],
    ops: [
      ...t.rows.slice(0, t.leavingRowNum).map(describeScale),
      undefined,
      ...t.rows.slice(t.leavingRowNum + 1).map(describeScale),
    ]
  };

  const done = removeProps(rest, 'enteringVar', 'leavingVar', 'leavingRowNum', 'ops');

  return {
    result: {
      ...done,
      type: 'nextbfs',
    },
    what: 'Pivot to the next feasible solution',
    how: <How>
      <p>In order to find the next feasible solution, we must pivot on the cell at the intersection of the entering and leaving variables, as marked on the tableau below:</p>
      <TableauView tableau={t} />
      <p>To do this, we first divide the row of the leaving variable by the value in the pivot cell:</p>
      <TableauView tableau={one} />
      <p>Then, we add some multiple of the row of the leaving variable to each other row, such that the entering variable becomes basic:</p>
      <TableauView tableau={rest} />
    </How>,
    view: <TableauView tableau={done} />,
  };
};

export const simplexIteration = (t) => {
  const steps = convertTo(t, ['nextbfs', 'optimaltableau']);
  const result = steps[steps.length-1].result;
  const isOptimal = result.type === 'optimaltableau';
  return {
    result: {
      ...result,
      type: result.type === 'nextbfs' ? 'bfstableau' : result.type,
    },
    what: 'Perform an iteration of the simplex algorithm',
    how: <StepList steps={steps} />,
    view: isOptimal ? <TableauView tableau={steps[steps.length-1].result} /> : undefined,
  };
};

export const readObjFn = (t) => {
  const basics = getBasicVars(t);
  const origExp = t.origObjFn.exp;
  const origVars = Object.keys(t.origObjFn.exp);

  const basicVal = (varName) => {
    const row = basics.findIndex(name => name === varName);
    if (row === -1)
      return coef(0);
    return t.rows[row]['rhs'];
  };

  return {
    result: {
      type: 'solution',
    },
    what: 'Read the optimal solution from the tableau',
    how: <How>
      <p>The optimal solution is determined by the values of the basic variables.</p>
    </How>,
    view: <div>
      <p>An optimal solution to the system is found with the following values:</p>
      {basics.map((varName, idx) => ({
        varName: varName,
        block: <BlockMath key={varName}>
          {`${varToTex(varName)} = ${coefToTex(t.rows[idx]['rhs'])}`}
        </BlockMath>
      })).filter(({varName, block}) => (
        Object.keys(t.origObjFn.exp).includes(varName)
      )).map(({varName, block}) => block)}

      <p>Recalling that our original objective function was:</p>
      <ObjectiveView className="final-obj-reading" obj={t.origObjFn} />
      <p>Substituting our found optimal values, we obtain an objective value of:</p>
      <BlockMath>
        {origVars.map(varName => `(${coefToTex(origExp[varName])})(${coefToTex(basicVal(varName))})`).join(' + ')+' = '+coefToTex(t.rows[0]['rhs'])}
      </BlockMath>
    </div>
  };
};

const conversions = [
  {from: 'program', to: 'stdprogram', cb: standardizeProgram},
  {from: 'stdprogram', to: 'unknowntableau', cb: standardProgramToTableau},
  {from: 'unknowntableau', to: 'bfstableau', cb: findBasicFeasibleSolution},
  {from: 'bfstableau', to: 'optimaltableau', cb: simplexIteration},

  {from: 'bfstableau', to: 'enteringtableau', cb: pickEnteringVariable},
  {from: 'enteringtableau', to: 'leavingtableau', cb: findLeavingVariable},
  {from: 'leavingtableau', to: 'nextbfs', cb: pivot},
  {from: 'optimaltableau', to: 'solution', cb: readObjFn},
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
  console.log(`findConversionChain: ${start} => ${end}`);
  if (start === end)
    return [];
  return _findConversionChain(reachableFrom(start).map(x => [x]), end).map(x => x.cb);
};

export function convertTo(obj, targets) {
  if (!Array.isArray(targets))
    targets = [targets];
  const to = targets[0];
  console.log(`convertTo: ${obj} => ${to}`);
  console.log(obj);
  let steps = [];
  for (let count = 0; !targets.includes(obj.type) && obj.type !== undefined && count < MAX_ITER; count++) {
    const callback = findConversionChain(obj.type, to)[0];
    let nextStep = callback(obj);
    nextStep.stepName = callback.name;
    steps.push(nextStep);
    obj = nextStep.result;
  }
  return steps;
};

window.s = {
  removeProps,

  conversions,
  reachableFrom,
  _findConversionChain,
  findConversionChain,
  convertTo,

  standardizeProgram,
  standardProgramToTableau,

  pickEnteringVariable,
  findLeavingVariable,
  pivot,
};
