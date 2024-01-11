/**
 * Almost the same as lodash@v4.0.0 groupBy
 * 
 * @since 3.10.0
 */
export function groupBy(array, keyFn) {
  return array.reduce((result, item) => {
    const key = keyFn(item);
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
    return result;
  }, {});
};