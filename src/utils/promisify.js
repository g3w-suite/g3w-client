/**
 * Migrate your consumer code away from jQuery promises.
 * 
 * @param promise jquery promise
 */
export function promisify(promise) {
  if (promise instanceof Promise) {
    return promise;
  }
  return new Promise((resolve, reject) => {
    promise.then(resolve).fail(reject);
  });
}