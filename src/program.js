import React from 'react';
import PropTypes from 'prop-types';
import { InlineMath } from 'react-katex';
import { mapVars } from './tableau';
import { varToTex, relToTex, coefToTex } from './fmt';

/*
The program:

max z = x1 + 2x2
x1 + x2 <= 3
x1, x2 non-negative

is represented by the object:

{
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
}*/

let pats = {};
pats.int = '-?\\d+';
pats.float = '-?\\d*\\.\\d+';
pats.frac = '-?\\d+/\\d+';
pats.value = '(?:'+[pats.int, pats.float, pats.frac].join('|')+')';
pats.coef = '(?:'+['', '-', pats.int, pats.float, pats.frac].join('|')+')';
pats.varName = '[a-zA-Z][0-9]*';
pats.varNameList = pats.varName+'(?:,\\s*'+pats.varName+')*';
pats.term = pats.coef+'\\s*'+pats.varName;
pats.plusMinus = '[-+]';
pats.poly = pats.term+'(?:\\s*'+pats.plusMinus+'\\s*'+pats.term+')*';
pats.varDec = '('+pats.varNameList+')\\s*(<|<=|=|>=|>)\\s*('+pats.value+')';

pats.captureNextTerm = '\\s*('+pats.plusMinus+')\\s*('+pats.coef+')\\s*('+pats.varName+')';
pats.captureObjective = '(min|max)\\s*('+pats.varName+')\\s*=\\s*('+pats.poly+')';
pats.captureConstraint = '('+pats.poly+')\\s*(<|<=|=|>=|>)\\s*('+pats.value+')';
pats.captureVarDec = '('+pats.varNameList+')\\s+(unrestricted|non-negative)';
Object.freeze(pats);

// Caching all regexps. We only use a few, but it's simpler to just pre-compute all, and it pays off anyway.
const exps = Object.keys(pats).reduce((exps, name) => {
  return {
    ...exps,
    [name]: {
      anywhere: new RegExp(pats[name]),
      beginning: new RegExp('^'+pats[name]),
      exact: new RegExp('^'+pats[name]+'$'),
    }
  };
}, {});


export const isCoef = (str) => {
  return exps.coef.exact.test(str);
};
export const parseCoef = (str) => {
  if (!isCoef(str))
    throw new Error('Invalid coef: '+str);
  if (str === '')
    return {num: 1, denom: 1};
  if (str === '-')
    return {num: -1, denom: 1};
  const [num='1', denom='1'] = str.split('/');
  return {num: parseFloat(num), denom: parseFloat(denom)};
};
const gcd = (a, b) => {
  a = Math.abs(a);
  b = Math.abs(b);
  if (b > a) [a, b] = [b, a];
  for (;;) {
    if (b === 0)
      return a;
    a %= b;
    if (a === 0)
      return b;
    b %= a;
  }
};
export const coefReduce = (c) => {
  if (c.num === 0)
    return {num: 0, denom: 1};
  if (Number.isInteger(c.num) && Number.isInteger(c.denom)) {
    const div = gcd(c.num, c.denom);
    return {num: c.num / div, denom: c.denom / div};
  }
  return {...c};
};
export const coefMult = (c1, c2) => (coefReduce({
  num: c1.num * c2.num,
  denom: c1.num * c2.num,
}));
export const coefDiv = (c1, c2) => (coefReduce({
  num: c1.num * c2.denom,
  denom: c1.num * c2.num,
}));
export const coefAdd = (c1, c2) => {
  if (c1.denom === c2.denom)
    return {num: c1.num + c2.num, denom: c1.denom};
  return coefReduce({
    num: c1.num * c2.denom + c2.num * c1.denom,
    denom: c1.denom * c2.denom,
  });
};
export const coefMultScalar = (c, s) => (coefReduce({
  num: c.num * s,
  denom: c.denom,
}));
export const coef = (n, d = 1) => (coefReduce({
  num: n,
  denom: d,
}));


export const parsePoly = (str) => {
  if (!exps.poly.exact.test(str))
    throw new Error('Invalid poly: '+str);
  let poly = {};
  str = '+'+str;
  do {
    const m = str.match(exps.captureNextTerm.beginning);
    if (m === null) throw new Error('parsePoly error null');
    if (m.index !== 0) throw new Error('parsePoly error no match');
    const [, sign, coef, varName] = m;
    if (poly[varName] !== undefined) throw new Error('parsePoly duplicate key');
    poly[varName] = parseCoef(coef);
    if (sign === '-')
      poly[varName].num *= -1;
    str = str.substr(m[0].length);
  } while (str.length > 0);
  return poly;
};
export const isPoly = (str) => {
  try {
    parsePoly(str);
  } catch (e) {
    return false;
  }
  return true;
};

export const parseObjective = (str) => {
  const m = str.match(exps.captureObjective.exact);
  if (!m)
    throw new Error('Invalid objective '+str);
  return {minmax: m[1], var: m[2], exp: parsePoly(m[3])};
};
export const isObjective = (str) => {
  return exps.captureObjective.exact.test(str);
};

export const parseConstraint = (str) => {
  const m = str.match(exps.captureConstraint.exact);
  if (!m)
    throw new Error('Invalid constraint '+str);
  return {exp: parsePoly(m[1]), rel: m[2], rhs: parseCoef(m[3])};
};
export const isConstraint = (str) => {
  return exps.captureConstraint.exact.test(str);
};

export const parseVarDec = (str) => {
  const m = str.match(exps.captureVarDec.exact);
  if (!m)
    throw new Error('Invalid variable declaration: '+str);
  const varList = m[1].split(',').map(name => name.trim());
  const decl = m[2];
  return varList.reduce((vars, newVar) => {
    return {
      ...vars,
      [newVar]: decl
    };
  }, {});
};
export const isVarDec = (str) => {
  return exps.captureVarDec.exact.test(str);
};

const reduceVarDecs = (newVars, oldVars = {}) => {
  return Object.keys(newVars).reduce((allVars, next) => {
    if (allVars[next] !== undefined)
      throw new Error('var '+next+' declared more than once');
    return {
      ...allVars,
      [next]: newVars[next]
    };
  }, oldVars);
};

export const parseProgram = (str) => {
  const lines = str.split('\n');
  const obj = parseObjective(lines[0]);
  let constraints = [];
  let varDecs = [];
  lines.slice(1).forEach((line) => {
    if (isConstraint(line))
      constraints.push(parseConstraint(line));
    else if (isVarDec(line))
      varDecs = reduceVarDecs(parseVarDec(line), varDecs);
    else
      throw new Error('Invalid line: '+line);
  });
  const usedVars = new Set(...[obj.exp, ...constraints.map(c => c.exp)].map(Object.keys));
  const declaredVars = new Set(Object.keys(varDecs));
  usedVars.forEach((used) => {
    if (!declaredVars.has(used))
      throw new Error('used var '+used+' not declared');
  });
  declaredVars.forEach((declared) => {
    if (!usedVars.has(declared))
      throw new Error('declared var '+declared+' not used');
  });
  return {
    obj,
    cons: constraints,
    vars: varDecs,
  }
};
export const isProgram = (str) => {
  try {
    parseProgram(str);
  } catch (e) {
    return false;
  }
  return true;
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
    p.vars[name] = restriction;
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
          throw new Error("don't know how to standardize strictly-{less,greater} than constraints");
        default:
          throw new Error("unknown relation: "+rel);
      }
    })(con));
  });
  return p;
};

window.p = {
  pats, exps,
  parseCoef, isCoef,
  parsePoly, isPoly,
  parseObjective, isObjective,
  parseConstraint, isConstraint,
  parseVarDec, isVarDec,
  parseProgram, isProgram,
};

export const ObjectiveView = ({obj, vars}) => {
  const varList = vars || Object.keys(obj.exp);
  return <div className="obj">
    <span className="minmax">{obj.minmax} </span><InlineMath>{
      obj.var + ' = ' + mapVars(obj.exp, varList, (name, val) => (
        coefToTex(val) + varToTex(name)
      ), true).join(' + ')
    }</InlineMath>
  </div>;
};
ObjectiveView.propTypes = {
  obj: PropTypes.object.isRequired,
  vars: PropTypes.array,
};

export const ConstraintView = ({con, vars}) => {
  const varList = vars || Object.keys(con.exp);
  return <div className="con">
    <InlineMath>{
      mapVars(con.exp, varList, (name, val) => (
        coefToTex(val) + varToTex(name)
      ), true).join(' + ') +
      ' '+relToTex(con.rel)+' '+coefToTex(con.rhs)
    }</InlineMath>
  </div>
};
ConstraintView.propTypes = {
  con: PropTypes.object.isRequired,
  vars: PropTypes.array,
};

export const RestrictionsView = ({restrictions, vars}) => {
  const varList = vars || Object.keys(restrictions);
  return <div className="restrictions">
    {Array.from(new Set(Object.values(restrictions))).map((restriction) => (
      <div className="vars" key={restriction}>
        <InlineMath>
          {mapVars(restrictions, varList, (name, val) => varToTex(name), true).join(', ')}
        </InlineMath>
        <span className="restriction"> {restriction}</span>
      </div>
    ))}
  </div>
};
RestrictionsView.propTypes = {
  restrictions: PropTypes.object.isRequired,
  vars: PropTypes.array,
};

export const ProgramView = ({program}) => {
  const p = program;
  const vars = Object.keys(p.vars);//.sort();
  console.log(p);
  return <div className="program">
    <ObjectiveView
      obj={p.obj}
      vars={vars} />
    <span className="subject-to">subject to </span>
    {p.cons.map((con, idx) => <ConstraintView
      key={idx}
      con={con}
      vars={vars} />)}
    <RestrictionsView
      restrictions={p.vars}
      vars={vars} />
  </div>;
};
ProgramView.propTypes = {
  program: PropTypes.object.isRequired,
};
