import { createSingleFieldParameter } from './createSingleFieldParameter';

const Filter     = require('core/layers/filter/filter');
const Expression = require('core/layers/filter/expression');

/**
 * Create filter from field based on search_endpoint
 */
export function createFilterFormField({
  layer,
  field,
  value,
  search_endpoint = 'ows',
  operator        = 'eq',
}){
  let filter;
  switch (search_endpoint) {
    case 'ows':
      const expression = new Expression();
      expression.createExpressionFromField({ field, value, operator, layerName: layer.getWMSLayerName() });
      filter = new Filter();
      filter.setExpression(expression.get());
      break;
    case 'api':
      filter = createSingleFieldParameter({ field, value, operator });
      break;
  }
  return filter;
};