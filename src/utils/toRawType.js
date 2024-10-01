export function toRawType(value) {
  return Object.prototype.toString.call(value).slice(8, -1)
}