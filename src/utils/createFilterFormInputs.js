import { createSingleFieldParameter } from 'utils/createSingleFieldParameter';

const Filter     = require('core/layers/filter/filter');
const Expression = require('core/layers/filter/expression');

/**
 * @param layer single layer or an array of layers
 * @param search_endpoint
 * @param inputs
 * 
 * @returns {*}
 */
export function createFilterFormInputs({
  layer,
  search_endpoint = 'ows',
  inputs          = [],
}) {

  let filters;

  switch (search_endpoint) {

    case 'ows':
      filters = [].concat(layer).map(l => {
        const e = new Expression();
        e.createExpressionFromFilter(inputs, l.getWMSLayerName());
        let f = new Filter();
        f.setExpression(e.get());
        return f;
      });
      break;

    case 'api':
      const fields = inputs.map(({ attribute, value, operator, logicop }, i) => {
        // multi key relation fields
        if (Array.isArray(attribute)) {
          return attribute
            .map((attr, j) => createSingleFieldParameter({ field: attr, value: value[j], operator, logicop: null }))
            .join('|AND,') || '';
        }
        // input logic operator 
        return `${i > 0 ? `|${inputs[i-1].logicop},` : ''}${createSingleFieldParameter({ field: attribute, value, operator, logicop })}`
      });
      let filter = fields.join('') || undefined; // NB: comma separator is already added before
      filters = [].concat(layer).map(() => filter);
      break;

  }

  // check if is a single layer of an array of layers
  return Array.isArray(layer) ? filters : filters[0];
}