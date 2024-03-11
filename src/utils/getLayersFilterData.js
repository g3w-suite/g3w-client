import { sortAlphabeticallyArray }                       from 'utils/sortAlphabeticallyArray';
import { sortNumericArray }                              from 'utils/sortNumericArray';

/**
 * @param layers
 * @param options.field
 * @param options.suggest
 * @param options.unique
 * @param options.fformatter since 3.9.0
 * @param options.ordering
 *
 * @returns { Promise<*> }
 *
 * @since 3.8.0
 */
export async function getLayersFilterData(layers, options = {}) {
  const {
    field,
    suggest,
    unique,
    ordering,
    fformatter,
  } = options;
  // get unique value from each layers
  const promisesData = await Promise
    .allSettled(layers.map(layer => layer.getFilterData({
      field,
      suggest,
      unique,
      ordering,
      fformatter,
    })));

  const data = Array.from(
    promisesData
      .filter(({status}) => 'fulfilled' === status)
      .reduce((accumulator, { value = [] }) => new Set([...accumulator, ...value]), [])
  )
  //check if is not empty array
  switch (data.length && typeof data[0]) {
    case 'string': return sortAlphabeticallyArray(data);
    case 'number': return sortNumericArray(data);
    default:       return data;
  }
};