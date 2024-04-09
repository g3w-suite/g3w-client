import { FILTER_EXPRESSION_OPERATORS } from 'app/constant';

const Filter     = require('core/layers/filter/filter');
const Expression = require('core/layers/filter/expression');
const operators  = Object.entries(FILTER_EXPRESSION_OPERATORS);

/**
 * @TODO deprecate `search_endpoint = 'ows'`
 */
export function createFilterFromString({
  layer,
  search_endpoint = 'api',
  filter          = '',
}) {

  switch (search_endpoint) {

    case 'ows':
      filter = (new Filter()).setExpression((new Expression({ filter, layerName: layer.getWMSLayerName() })).get());
      break;

    case 'api':
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
      break;

  }
  return filter;
};