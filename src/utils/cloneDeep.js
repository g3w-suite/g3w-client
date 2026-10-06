/**
 * Deeply clones arrays and enumerable own properties of objects.
 *
 * Cycles and shared references are preserved. Date, RegExp, Map, Set,
 * ArrayBuffer, and typed-array views are cloned; functions are kept by
 * reference. Other class instances retain their prototype, but only their
 * enumerable own properties are copied, not private or internal state.
 *
 * @deprecated Kept for compatibility; prefer a type-specific copy in new code.
 * @param {*} obj Value to clone.
 * @returns {*} The cloned value.
 */
export function cloneDeep(obj) {
  return cloneValue(obj, new WeakMap());
}

function cloneValue(value, seen) {
  if (null === value || 'object' !== typeof value) return value;
  if (seen.has(value)) return seen.get(value);

  let copy;

  if (value instanceof Date) {
    copy = new Date(value.getTime());
  }

  if (value instanceof RegExp) {
    copy = new RegExp(value.source, value.flags);
    copy.lastIndex = value.lastIndex;
  }

  if (value instanceof Map) {
    copy = new Map();
    seen.set(value, copy);
    value.forEach((entry, key) => copy.set(cloneValue(key, seen), cloneValue(entry, seen)));
  }

  if (value instanceof Set) {
    copy = new Set();
    seen.set(value, copy);
    value.forEach(entry => copy.add(cloneValue(entry, seen)));
  }

  if (value instanceof ArrayBuffer) {
    copy = value.slice(0);
  }

  if (ArrayBuffer.isView(value)) {
    const buffer = cloneValue(value.buffer, seen);
    copy = value instanceof DataView
      ? new DataView(buffer, value.byteOffset, value.byteLength)
      : new value.constructor(buffer, value.byteOffset, value.length);
  }

  if (undefined === copy) {
    if (Array.isArray(value)) {
      copy = new Array(value.length);
      Object.setPrototypeOf(copy, Object.getPrototypeOf(value));
    }

    if (undefined === copy) {
      copy = Object.create(Object.getPrototypeOf(value));
    }
  }

  seen.set(value, copy);

  const keys = Object.keys(value);

  for (const symbol of Object.getOwnPropertySymbols(value)) {
    if (Object.prototype.propertyIsEnumerable.call(value, symbol)) {
      keys.push(symbol);
    }
  }

  for (const key of keys) {
    Object.defineProperty(copy, key, {
      configurable: true,
      enumerable:   true,
      writable:     true,
      value:        cloneValue(value[key], seen)
    });
  }

  return copy;
}