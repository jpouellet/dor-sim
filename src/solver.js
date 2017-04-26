import { coef, coefMultScalar } from './program';
import { mapVars } from './fmt';

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
    result: p,
    what: 'standardize program',
    how: 'by turning inequalities into equalities',
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
    result: tableau,
    what: 'convert to standard tableau',
    how: 'by doing stuff',
  };
};

const conversions = [
  {from: 'program', to: 'stdprogram', cb: standardizeProgram},
  {from: 'stdprogram', to: 'tableau', cb: standardProgramToTableau},
  {from: 'tableau', to: 'bfstableau', cb: (x) => ({result: x, what: 'nothing', how: 'assumed'})},
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

window.s = {
  conversions,
  reachableFrom,
  _findConversionChain,
  findConversionChain,
};
