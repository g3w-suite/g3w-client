/** @deprecated Use context-specific native checks: typeof, Array.isArray, or instanceof. */
export function toRawType(value) {
  return Object.prototype.toString.call(value).slice(8, -1)
}