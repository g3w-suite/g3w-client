/**
 * Wrap a deprecated function and report its first invocation.
 *
 * throws instead of logging, and traceDeprecation logs with console.trace.
 * The wrapper preserves the receiver, arguments, and return value.
 *
 * @param {Function} fn Function to wrap.
 * @param {string} message Deprecation message.
 * @returns {Function} The original or wrapped function.
 */
export function deprecate(fn, message) {
  let warned = false;
  return function deprecated(...args) {
    if (!warned) {
      console.warn(message);
      warned = true;
    }
    return fn.apply(this, args);
  };
}