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
export function flattenObject(obj, sep = '_', parent = '', out = {}) {
  for (let key in obj) {
    let prop = parent ? parent + sep + key : key;
    if ('object' === typeof obj[key]) {
      flattenObject(obj[key], sep, prop, out);
    } else {
      out[prop] = obj[key];
    }
  }
  return out;
}