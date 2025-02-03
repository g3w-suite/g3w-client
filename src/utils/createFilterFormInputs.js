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

  const filter = inputs.map((input, i) => Array.isArray(input.attribute)
    // multi key relation fields
    ? input.attribute.map((attr, j) => [].concat(input.value[j]).map(v => `${attr}|${(input.operator || 'eq').toLowerCase()}|${encodeURIComponent(v)}`).join(`|null,`)).join('|AND,')
    // input logic operator 
    : `${i > 0 ? `|${inputs[i-1].logicop},` : ''}${[].concat(input.value).map(v => `${input.attribute}|${(input.operator || 'eq').toLowerCase()}|${encodeURIComponent(v)}`).join(`|${undefined !== input.logicop ? input.logicop : 'OR'},`)}`
  ).join('') || undefined;

  // check if is a single layer of an array of layers
  return Array.isArray(layer) ? layer.map(() => filter) : filter;
}