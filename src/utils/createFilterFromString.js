import { FILTER_EXPRESSION_OPERATORS } from 'app/constant';

const Filter     = require('core/layers/filter/filter');
const Expression = require('core/layers/filter/expression');

export function createFilterFromString({
  layer,
  search_endpoint = 'ows',
  filter          = '',
}) {
  switch (search_endpoint) {

    case 'ows':
      const e = new Expression({ filter, layerName: layer.getWMSLayerName() });
      filter = new Filter();
      filter.setExpression(e.get());
      break;

    case 'api':
      filter = Object
        .values(FILTER_EXPRESSION_OPERATORS)
        .reduce((acc, op) => acc
          .replace(new RegExp(`\\s+${op}\\s+`, 'g'), `${op}`) // remove all blank space between operators
          .replace(new RegExp(`'${op}`, 'g'), `${op}`)        // leading single quote
          .replace(new RegExp(`${op}'`, 'g'), `${op}`)        // trailing single quote
        , filter)
        .replace(/'$/g, '')
        .replace(/"/g, '');
      filter = Object
        .entries(FILTER_EXPRESSION_OPERATORS)
        .reduce((acc, [k, v]) => acc.replace(new RegExp(v, "g"), ['AND', 'OR'].includes(v) ? `|${k},` : `|${k}|`), filter)
        // encode value
        .split('|')
        .map((v, i) => (0 === (i+1) % 3) ? encodeURIComponent(v) : v)
        .join('|');
      break;

  }
  return filter;
};