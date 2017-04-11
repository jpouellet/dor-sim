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

export const parseCoef = (str) => {
  if (str === '')
    return {num: 1, denom: 1};
  if (str === '-')
    return {num: -1, denom: 1};
  const [num=1, denom=1] = str.split('/');
  return {num: parseFloat(num), denom: parseFloat(denom)};
};
export const isCoef = (str) => {
  return exps.coef.exact.test(str);
};

export const parsePoly = (str) => {
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
  if (!exps.poly.exact.test(str))
    return false;
  try {
    parsePoly(str);
  } catch (e) {
    return false;
  }
  return true;
};

export const parseObjective = (str) => {
  const m = str.match(exps.captureObjective.exact);
  return {minmax: m[1], var: m[2], exp: parsePoly(m[3])};
};
export const isObjective = (str) => {
  return exps.captureObjective.exact.test(str);
};

export const parseConstraint = (str) => {
  const m = str.match(exps.captureConstraint.exact);
  return {exp: parsePoly(m[1]), rel: m[2], rhs: parseCoef(m[3])};
};
export const isConstraint = (str) => {
  return exps.captureConstraint.exact.test(str);
};

export const parseVarDec = (str) => {
  const m = str.match(exps.captureVarDec.exact);
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
      throw new Error('invalid line: '+line);
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
  num + (denom !== 1 ? '/'+denom : '')
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
