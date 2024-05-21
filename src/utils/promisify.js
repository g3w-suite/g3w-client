/**
 * Migrate your consumer code away from jQuery promises.
 * 
 * @param promise jquery promise
 */
export function promisify(promise) {
  if (promise instanceof Promise) {
    return promise;
  }
  if (!promise || !promise.then) {
    console.trace(promise);
    return Promise.reject('not a promise');
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
  if (undefined === promise) {
    console.trace();
    return $.Deferred(d=> d.reject('not a promise')).promise();
  }
  if (promise.always) {
    return promise;
  }
  return $.Deferred(async d => {
    try { d.resolve(await (promise instanceof Promise ? promise : promise())); }
    catch (e) { d.reject(e); }
  }).promise();
}