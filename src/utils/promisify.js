/**
 * Migrate your consumer code away from jQuery promises.
 * 
 * @param promise jquery promise
 */
export function promisify(promise) {
  console.assert(undefined !== promise, 'promise is undefined');
  if (undefined === promise) {
    console.trace();
  }
  if (promise instanceof Promise) {
    return promise;
  }
  return new Promise((resolve, reject) => {
    promise.then(resolve).fail(reject);
  });
}

/**
 * Migrate your consumer code away from jQuery promises.
 * 
 * @param promise async function or ES6 promise 
 */
export function $promisify(promise) {
  console.assert(undefined !== promise, 'promise is undefined');
  if (undefined === promise) {
    console.trace();
  }
  if (promise.always) {
    return promise;
  }
  return $.Deferred(async d => {
    try { d.resolve(await (promise instanceof Promise ? promise : promise())); }
    catch (e) { d.reject(e); }
  }).promise();
}