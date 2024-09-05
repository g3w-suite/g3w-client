import { FILTER_EXPRESSION_OPERATORS } from 'app/constant';

const operators  = Object.entries(FILTER_EXPRESSION_OPERATORS);

export function createFilterFromString({ filter = '' }) {
  filter = operators
    .reduce((acc, [_, op]) => acc
      .replace(new RegExp(`\\s+${op}\\s+`, 'g'), `${op}`) // remove all blank space between operators
      .replace(new RegExp(`'${op}`, 'g'), `${op}`)        // leading single quote
      .replace(new RegExp(`${op}'`, 'g'), `${op}`)        // trailing single quote
    , filter)
    .replace(/'$/g, '')
    .replace(/"/g, '');
  filter = operators
    .reduce((acc, [k, op]) => acc.replace(new RegExp(op, 'g'), ['AND', 'OR'].includes(op) ? `|${k},` : `|${k}|`), filter)
    // encode value
    .split('|')
    .map((v, i) => (0 === (i+1) % 3) ? encodeURIComponent(v) : v)
    .join('|');

  return filter;
}