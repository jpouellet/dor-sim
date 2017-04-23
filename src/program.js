import React from 'react';
import PropTypes from 'prop-types';
import { InlineMath } from 'react-katex';
import { mapVars } from './tableau';

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

export const coefToString = ({num, denom}) => (
  (denom === 1 ? (num === 1 ? '' : num === -1 ? '-' : num) : num) +
  (denom !== 1 ? '/'+denom : '')
);

export const programToString = (p) => {
  const vars = Object.keys(p.vars);//.sort();
  console.log(p);
  return [
    p.obj.minmax+' '+p.obj.var+' = '+vars.filter(varName => p.obj.exp[varName]).map(varName => coefToString(p.obj.exp[varName])+varName).join(' + '),
    ...p.cons.map((con) => (
      vars.filter(varName => con.exp[varName])
      .map(varName => coefToString(con.exp[varName])+varName)
      .join(' + ')+' '+con.rel+' '+coefToString(con.rhs)
    )),
    ...Array.from(new Set(Object.values(p.vars))).map((restriction) => (
      vars.filter(varName => p.vars[varName] === restriction)
      .join(', ')+' '+restriction
    )),
  ].join('\n');
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

export const coefToTex = (coef) => {
  return coefToString(coef);
};
const varSplitRe = new RegExp("^(.*)([0-9]*)$");
export const varToTex = (name) => {
  const m = varSplitRe.exec(name);
  return m[1]+(m[2] ? '_{'+m[2]+'}' : '');
};
export const relToTex = (rel) => {
  switch (rel) {
    case '<':  return '\\le';
    case '<=': return '\\leq';
    case '=':  return '=';
    case '>=': return '\\geq';
    case '>':  return '\\gt';
    default:   return rel;
  }
};

export const ProgramView = ({program}) => {
  const p = program;
  const vars = Object.keys(p.vars);//.sort();
  console.log(p);
  return <div className="program">
    <div className="obj">
      <span className="minmax">{p.obj.minmax} </span><InlineMath>{
        p.obj.var + ' = ' + mapVars(p.obj.exp, vars, (name, val) => (
          coefToTex(val) + varToTex(name)
        ), true).join(' + ')
      }</InlineMath>
    </div>
    {p.cons.map((con, idx) => (
      <div className="con" key={idx}>
        <span className="subject-to">{idx === 0 ? 'subject to ' : ''}</span>
        <InlineMath>{
          mapVars(con.exp, vars, (name, val) => (
            coefToTex(val) + varToTex(name)
          ), true).join(' + ') +
          ' '+relToTex(con.rel)+' '+coefToTex(con.rhs)
        }</InlineMath>
      </div>
    ))}
    {Array.from(new Set(Object.values(p.vars))).map((restriction) => (
      <div className="vars" key={restriction}>
        <InlineMath>{
          vars.filter(
            varName => p.vars[varName] === restriction
          ).join(', ')
        }</InlineMath> <span className="restriction">{restriction}</span>
      </div>
    ))}
  </div>;
};
ProgramView.propTypes = {
  program: PropTypes.object.isRequired,
};
