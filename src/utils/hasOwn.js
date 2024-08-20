export function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}