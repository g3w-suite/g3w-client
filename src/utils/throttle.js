/**
 * build throttle function
 */
export function throttle(fnc, delay=500) {
  let lastCall;
  return function (...args) {
    let previousCall = lastCall;
    lastCall = Date.now();
    if (previousCall === undefined // function is being called for the first time
      || (lastCall - previousCall) > delay) { // throttle time has elapsed
      fnc(...args);
    }
  }
};