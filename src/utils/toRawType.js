export function toRawType(value) {
  const _toString = Object.prototype.toString;
  return _toString.call(value).slice(8, -1)
};