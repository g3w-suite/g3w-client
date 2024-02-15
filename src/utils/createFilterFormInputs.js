import { createSingleFieldParameter } from './createSingleFieldParameter';

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

  //check if is a single layer of array of layers
  const isLayerArray = Array.isArray(layer);

  let filter;
  let filters = []; // in case of layer is an array

  switch (search_endpoint) {

    case 'ows':
      if (isLayerArray) {
        layer.forEach(layer =>{
          const expression = new Expression();
          expression.createExpressionFromFilter(inputs, layer.getWMSLayerName());
          filter = new Filter();
          filter.setExpression(expression.get());
          filters.push(filter);
        })
      } else {
        const expression = new Expression();
        expression.createExpressionFromFilter(inputs, layer.getWMSLayerName());
        filter = new Filter();
        filter.setExpression(expression.get());
      }
      break;

    case 'api':
      //get inputs length
      const inputsLength = inputs.length;
      const fields = inputs
        .map((input, inputIndex) => {
          //take in account multi key relation fields
          if (Array.isArray(input.attribute)) {
            const attributesLength = input.attribute.length;
            return input.attribute
              .reduce(
                (accumulator, attribute, index) => {
                return accumulator + createSingleFieldParameter({
                  field: attribute,
                  value: input.value[index],
                  operator: input.operator,
                  logicop: null
                }) + (
                  (index < attributesLength - 1) 
                    ? '|AND,'
                    : inputIndex < inputsLength - 1 
                      ? `|${input.logicop},`
                      : ''
                );
              }, '');
          } else {
            //need to add logic operator of input
            return `${inputIndex > 0 ? `|${inputs[inputIndex -1].logicop},` : ''}${createSingleFieldParameter({
              field: input.attribute,
              value: input.value,
              operator: input.operator,
              logicop: input.logicop,
            })}`
          }
        });
      //need to join with empty value because comma separation at the end is already add at the end
      filter = fields.length > 0 ? fields.join('') : undefined;
      if (isLayerArray) {
        layer.forEach(() => filters.push(filter));
      }
      break;

  }

  return isLayerArray ? filters  : filter;
};