import { FILTER_EXPRESSION_OPERATORS } from 'app/constant';
import { createFilterFromString }      from 'utils/createFilterFromString';

/**
 * @TODO deprecate `search_endpoint = 'ows'`
 * 
 * @param { Object } opts
 * @param opts.layer
 * @param opts.field
 * @param opts.value
 * @param { string } [opts.operator='eq']         'eq' as default
 * @param { string } [opts.logicop='OR']          'OR' as default
 * @param { string } [opts.search_endpoint='api'] 'api' as default
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
  search_endpoint = 'api',
}) {

  // API search
  if ('api' === search_endpoint) {
    return [].concat(value).map(v => `${field}|${operator.toLowerCase()}|${encodeURIComponent(v)}`).join(`|${logicop},`);
  }

  // OWS search
  return createFilterFromString({
    layer,
    search_endpoint,
    filter: [].concat(value).map(v => `"${field}" ${FILTER_EXPRESSION_OPERATORS[operator]} '${encodeURIComponent(v)}' `).join(`${logicop} `),
  });

}