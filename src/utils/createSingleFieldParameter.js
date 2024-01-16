import { FILTER_EXPRESSION_OPERATORS } from 'app/constant';
import { createFilterFromString } from './createFilterFromString';

/**
 * @param { Object } opts
 * @param opts.layer
 * @param opts.field
 * @param opts.value
 * @param { string } [opts.operator='eq']         'eq' as default
 * @param { string } [opts.logicop='OR']          'OR' as default
 * @param { string } [opts.search_endpoint='api'] 'api' as default
 * 
 * @returns {string}
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
  /** Check if search_endpoint is api and value is an array */
  if ('api' === search_endpoint && Array.isArray(value)) {
    let filter = '';
    const valueLenght = value.length;
    value.forEach((value, index) => {
      filter += `${field}|${operator.toLowerCase()}|${encodeURIComponent(value)}${index < valueLenght - 1 ? `|${logicop},` : ''}`;
    });
    return filter
  }

  /** Case search_endpoint is api and value is single value*/
  if('api' === search_endpoint ) {
    return `${field}|${operator.toLowerCase()}|${encodeURIComponent(value)}`;
  }

  //in case of search_endpoint equal to ows

  // store filter string 
  let filter = '';

  // value is array of values
  if (Array.isArray(value)) {
    const valueLenght = value.length;
    value.forEach((value, index) => {
      filter += `"${field}" ${FILTER_EXPRESSION_OPERATORS[operator]} '${encodeURIComponent(value)}' ${index < valueLenght - 1 ? `${logicop} ` : ''}`
    });
  } else {
    //single value
    filter = `"${field}" ${FILTER_EXPRESSION_OPERATORS[operator]} '${encodeURIComponent(value)}'`;
  }

  return createFilterFromString({
    layer,
    search_endpoint,
    filter,
  });

};