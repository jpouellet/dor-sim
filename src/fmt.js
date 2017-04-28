export const mapVars = (exp, vars, fn, onlyDefined, nonZero) => {
  let varList;
  if (Array.isArray(vars))
    varList = vars;
  else
    varList = Object.keys(vars);
  if (onlyDefined)
    varList = varList.filter(varName => exp[varName] !== undefined);
  if (nonZero)
    varList = varList.filter(varName => exp[varName].num !== 0);
  return varList.map(varName => fn(varName, exp[varName]));
};

export const coefToString = ({num, denom}, collapseOne) => {
  if (collapseOne) {
    if (num === 1 && denom === 1)
      return '';
    if (num === -1 && denom === 1)
      return '-';
  }
  if (denom === 1)
    return num;
  return num+'/'+denom;
};

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

export const coefToTex = ({num, denom}, collapse) => {
  if (collapse) {
    if (num === 1 && denom === 1)
      return '';
    if (num === -1 && denom === 1)
      return '-';
  }
  if (denom === 1)
    return num;
  return `\\frac{${num}}{${denom}}`;
};

const varSplitRe = new RegExp("^(.*?)([0-9]*)$");
export const varToTex = (name) => {
  const m = varSplitRe.exec(name);
  return m[1]+(m[2] ? `_{${m[2]}}` : '');
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

const polyToFormatted = (coefFmt, varFmt) => (exp, vars, collapse) => {
  const varList = vars || Object.keys(exp);
  return mapVars(exp, varList, (name, val) => {
    if (collapse && val.num === 0)
      return null;
    return coefFmt(val, true) + varFmt(name);
  }, true).filter(x => x !== null).join(' + '); // TODO fix +/-
};
export const polyToString = polyToFormatted(coefToString, varName => varName);
export const polyToTex = polyToFormatted(coefToTex, varToTex);

window.f = {
  mapVars,
  coefToString,
  programToString,
  coefToTex,
  varToTex,
  relToTex,
  polyToFormatted,
  polyToString,
  polyToTex,
};
