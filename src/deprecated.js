/**
 * @file shims legacy variables to ensure backward compatibily with old G3W-CLIENT plugins (eg. window variables)
 * @since v3.8
 */

import * as VueColor from 'vue-color';

const deprecate = require('util-deprecate');

/**
 *  If `localStorage.traceDeprecation = true` is set, then deprecated functions
 * will invoke `console.trace()` instead of `console.error()`.
 */
// localStorage.traceDeprecation = true;

/**
 * Patch built-in `Promise()`constructor in a ES5 compatible way
 * 
 * @see https://stackoverflow.com/a/41792085
 * @see https://stackoverflow.com/a/51860850
 */
const oldPromise = globalThis.Promise;
const Promise = function() {
  let _resolve, _reject, executor = arguments[0];

  // Save a reference to `Promise.resolve()` and `Promise.reject()`
  arguments[0] = (resolve, reject) => { _resolve = resolve; _reject = reject; return executor(resolve, reject); };

  // Make a `super` call via `Reflect.construct`
  let p = Reflect.construct(oldPromise, arguments, Promise);

  /**
   * @deprecated since v3.8. Will be removed in v4.x. Use native 'Promise.resolve()' instead
   * 
   * In case you need similar behavior, you can implement it on you own in vanilla JavaScript:
   * 
   *   let _resolve, _reject;
   *   let promise = new Promise((resolve, reject) => { _resolve = resolve; _reject = reject; });
   *   promise.resolve() = _resolve;
   *   promise.resolve() = _reject;
   */
  p.resolve = deprecate(_resolve, '[G3W-CLIENT] $.Defferred::resolve() is deprecated');

  /**
   * @deprecated since v3.8. Will be removed in v4.x. Use native 'Promise.resolve()' instead
   * 
   * In case you need similar behavior, you can implement it on you own in vanilla JavaScript:
   * 
   *   let _resolve, _reject;
   *   let promise = new Promise((resolve, reject) => { _resolve = resolve; _reject = reject; });
   *   promise.resolve() = _resolve;
   *   promise.resolve() = _reject;
   */
  p.reject = deprecate(_reject, '[G3W-CLIENT] $.Defferred::resolve() is deprecated');;

  /**
   * @deprecated since v3.8. Will be removed in v4.x. Use native 'Promise.catch' instead
   */
  p.fail = deprecate(Promise.prototype.catch, '[G3W-CLIENT] $.Defferred::fail() is deprecated');

  /**
   * @deprecated since v3.8. Will be removed in v4.x. Use native 'Promise.finally' instead
   */
  p.always = deprecate(Promise.prototype.finally, '[G3W-CLIENT] $.Defferred::always() is deprecated');

  return p;
};

Object.setPrototypeOf(Promise, oldPromise);              // Make `Promise` inherit statics from `oldPromise`
Promise.prototype = Object.create(oldPromise.prototype); // Create the prototype, add methods to it
Promise.prototype.constructor = Promise;                 // Restore modified `Promise` constructor method
globalThis.Promise = Promise;                            // Override global `Promise` object

/**
 * Monkey patch jQuery `$.Deferred()` constructor in order to ensure backward compatibility
 */
const _Deferred = $.Deferred;
$.Deferred = function() {
  const d = new _Deferred(...arguments);

  /**
   * @deprecated since v3.8. Will be removed in v4.x. Use native 'Promise' instead
   */
  d.promise = deprecate(d.promise, '[G3W-CLIENT] $.Deferred::promise() is deprecated');

  /**
   * @deprecated since v3.8. Will be removed in v4.x. Use native 'Promise.resolve' instead
   * 
   * In case you need similar behavior, you can implement it on you own in vanilla JavaScript:
   * 
   *   let _resolve, _reject;
   *   let promise = new Promise((resolve, reject) => { _resolve = resolve; _reject = reject; });
   *   promise.resolve() = _resolve;
   *   promise.resolve() = _reject;
   */
  d.resolve = deprecate(d.reject, '[G3W-CLIENT] $.Deferred::resolve() is deprecated');

  /**
   * @deprecated since v3.8. Will be removed in v4.x. Use native 'Promise.resolve' instead
   * 
   * In case you need similar behavior, you can implement it on you own in vanilla JavaScript:
   * 
   *   let _resolve, _reject;
   *   let promise = new Promise((resolve, reject) => { _resolve = resolve; _reject = reject; });
   *   promise.resolve() = _resolve;
   *   promise.resolve() = _reject;
   */
  d.reject = deprecate(d.reject, '[G3W-CLIENT] $.Deferred::reject() is deprecated');

  /**
   * @deprecated since v3.8. Will be removed in v4.x. Use native 'Promise.then' instead
   */
  d.done = deprecate(d.done, '[G3W-CLIENT] $.Deferred::done() is deprecated');

  /**
   * @deprecated since v3.8. Will be removed in v4.x. Use native 'Promise.catch' instead
   */
  d.fail = deprecate(d.fail, '[G3W-CLIENT] $.Deferred::fail() is deprecated');
  d.catch = deprecate(d.fail, '[G3W-CLIENT] $.Deferred() is deprecated');

  /**
   * @deprecated since v3.8. Will be removed in v4.x. Use native 'Promise.finally' instead
   */
  d.always = deprecate(d.always, '[G3W-CLIENT] $.Deferred::always() is deprecated');
  d.finally = deprecate(d.always, '[G3W-CLIENT] $.Deferred() is deprecated');

  return d;
}

/**
 * @deprecated since v3.8. Will be removed in v4.x. Use native 'fetch' instead
 */
$.get = deprecate($.get, '[G3W-CLIENT] $.get() is deprecated');

/**
 * @deprecated since v3.8. Will be removed in v4.x. Use native 'fetch' instead
 */
$.post = deprecate($.post, '[G3W-CLIENT] $.post() is deprecated');

/**
 * @deprecated since v3.8. Will be removed in v4.x. Use ESM imports from 'vue-color' instead
 */
globalThis.VueColor = VueColor;

/**
 * @deprecated since v3.8. Will be removed in v4.x. Use require('vue-cookie') instead of window.VueCookie
 */
globalThis.VueCookie = require('vue-cookie');