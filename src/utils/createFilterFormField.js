import { createSingleFieldParameter } from 'utils/createSingleFieldParameter';

const Filter     = require('core/layers/filter/filter');
const Expression = require('core/layers/filter/expression');

/**
 * @TODO deprecate `search_endpoint = 'ows'`
 * 
 * Create filter from field based on search_endpoint
 */
export function createFilterFormField({
  layer,
  field,
  value,
  search_endpoint = 'api',
  operator        = 'eq',
}){
  let filter;
  switch (search_endpoint) {
    case 'ows':
      filter = (new Filter()).setExpression((new Expression()).createExpressionFromField({ field, value, operator, layerName: layer.getWMSLayerName() }).get());
      break;
    case 'api':
      filter = createSingleFieldParameter({ field, value, operator });
      break;
  }
  return filter;
};