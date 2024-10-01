import { createSingleFieldParameter } from 'utils/createSingleFieldParameter';

/**
 * @param layer single layer or an array of layers
 * @param inputs
 * 
 * @returns {*}
 */
export function createFilterFormInputs({
  layer,
  inputs = [],
}) {

  let filters;

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

  // check if is a single layer of an array of layers
  return Array.isArray(layer) ? filters : filters[0];
}