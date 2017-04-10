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
pats.captureVarDec = '('+pats.varNameList+')\\s+(unrestricted)';
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
  return {exp: m[1], rel: m[2], rhs: parseCoef(m[3])};
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

export const parseTableau = (str) => {
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
export const isTableau = (str) => {
  try {
    parseTableau(str);
  } catch (e) {
    return false;
  }
  return true;
};

window.t = {
  program: 'max z = x1 + 2x2\nx1 + x2 < 3\nx1, x2 unrestricted',
  pats, exps,
  parseCoef, isCoef,
  parsePoly, isPoly,
  parseObjective, isObjective,
  parseConstraint, isConstraint,
  parseVarDec, isVarDec,
  parseTableau, isTableau,
};
