import { FILTER_EXPRESSION_OPERATORS } from 'app/constant';

const Filter     = require('core/layers/filter/filter');
const Expression = require('core/layers/filter/expression');

export function createFilterFromString({
  layer,
  search_endpoint = 'ows',
  filter          = '',
}) {
  let stringFilter = filter;
  switch (search_endpoint) {

    case 'ows':
      const expression = new Expression({ layerName: layer.getWMSLayerName(), filter:stringFilter });
      filter = new Filter();
      filter.setExpression(expression.get());
      break;

    case 'api':
      Object
        .values(FILTER_EXPRESSION_OPERATORS)
        .forEach(operator => {
          stringFilter = stringFilter.replace(new RegExp(`\\s+${operator}\\s+`, 'g'), `${operator}`); // remove all blank space between operators
          stringFilter = stringFilter.replace(new RegExp(`'${operator}`, 'g'), `${operator}`);        // leading single quote
          stringFilter = stringFilter.replace(new RegExp(`${operator}'`, 'g'), `${operator}`);        // traling single quote
        });
      stringFilter = stringFilter.replace(/'$/g, '');
      filter = stringFilter.replace(/"/g, '');

      Object
        .entries(FILTER_EXPRESSION_OPERATORS)
        .forEach(([key, value]) => {
        filter = filter.replace(new RegExp(value, "g"), value === 'AND' || value === 'OR' ? `|${key},` : `|${key}|`);
      });
      //encode value
      filter = filter.split('|').map((value, index) => (0 === (index +1 ) % 3) ? encodeURIComponent(value) : value).join('|');
      break;

  }
  return filter;
};