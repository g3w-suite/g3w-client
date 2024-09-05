/**
 * @param { Object } opts
 * @param opts.layer
 * @param opts.field
 * @param opts.value
 * @param { string } [opts.operator='eq']         'eq' as default
 * @param { string } [opts.logicop='OR']          'OR' as default
 * 
 * @returns { string } filter
 * 
 * @since 3.8.7
 */
export function createSingleFieldParameter({
  layer,
  field,
  value,
  operator        = 'eq',
  logicop         = 'OR',
}) {
  return [].concat(value).map(v => `${field}|${operator.toLowerCase()}|${encodeURIComponent(v)}`).join(`|${logicop},`);
}