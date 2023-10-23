import { FILTER_EXPRESSION_OPERATORS } from 'app/constant';

/**
 * @param field
 * @param value
 * @param operator
 * @param logicop // set OR as default
 * @param search_endpoint
 * 
 * @returns {string}
 * 
 * @since 3.8.7
 */
export function createSingleFieldParameter({
  field,
  value,
  operator        = 'eq',
  logicop         = 'OR',
  search_endpoint = 'api',
}) {

  /** @TODO add description */
  if ('api' === search_endpoint && Array.isArray(value)) {
    let filter = '';
    const valueLenght = value.length;
    value.forEach((value, index) => {
      filter += `${field}|${operator.toLowerCase()}|${encodeURIComponent(value)}${index < valueLenght - 1 ? `|${logicop},` : ''}`;
    });
    return filter
  }

  /** @TODO add description */
  if('api' === search_endpoint ) {
    return `${field}|${operator.toLowerCase()}|${encodeURIComponent(value)}${logicop ? `|${logicop}` : ''}`;
  }

  /** @TODO add description */
  if (Array.isArray(value)) {
    let filter = '';
    const valueLenght = value.length;
    value.forEach((value, index) => {
      filter+=`"${field}" ${FILTER_EXPRESSION_OPERATORS[operator]} '${encodeURIComponent(value)}' ${index < valueLenght - 1 ? `${logicop} ` : ''}`
    });
    return filter
  }

  /** @TODO add description */
  return `"${field}" ${FILTER_EXPRESSION_OPERATORS[operator]} '${encodeURIComponent(value)}'`;
};