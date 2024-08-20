/**
 * ORIGINAL SOURCE: https://stackoverflow.com/a/56253298
 * 
 * @example 
 * 
 * ### Sample Input
 * 
 * ```
 * const obj = {
 *  name: "test",
 *  address: {
 *    personal: "abc",
 *      office: {
 *        building: 'random',
 *        street: 'some street'
 *      }
 *    }
 *  }
 * ```
 * 
 * ### Expected Output
 * 
 * ```
 * {
 *   name : "test",
 *   address_personal: "abc"
 *   address_office_building: "random"
 *   address_office_street: "some street"
 * }
 * ```
 * 
 * @since 3.9.0
 */
export function flattenObject(obj, parent, res = {}) {
  for (let key in obj) {
    let propName = parent ? parent + '_' + key : key;
    if ('object' === typeof obj[key]) {
      flattenObject(obj[key], propName, res);
    } else {
      res[propName] = obj[key];
    }
  }
  return res;
}