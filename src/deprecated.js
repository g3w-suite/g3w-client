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
 * Monkey patch $.Deferred constructor in order to ensure backward compatibility
 */
const _Deferred = $.Deferred;
// $.Deferred = function() {
//   const d = new _Deferred(...arguments);
//   /**
//    * @deprecated since v3.8. Will be removed in v4.x. Use native 'Promise.catch' instead
//    */
//   d.fail = deprecate(d.fail, '[G3W-CLIENT] jQuery $.Deferred() is deprecated, use native Promise() instead');
//   d.catch = deprecate(d.fail, '[G3W-CLIENT] jQuery $.Deferred() is deprecated, use native Promise() instead');
//   /**
//    * @deprecated since v3.8. Will be removed in v4.x. Use native 'Promise.finally' instead
//    */
//   d.always = deprecate(d.always, '[G3W-CLIENT] jQuery $.Deferred() is deprecated, use native Promise() instead');
//   d.finally = deprecate(d.always, '[G3W-CLIENT] jQuery $.Deferred() is deprecated, use native Promise() instead');
//   return d;
// }

/**
 * @deprecated since v3.8. Will be removed in v4.x. Use native 'Promise.catch' instead
 */
Promise.prototype.fail = deprecate(Promise.prototype.catch, '[G3W-CLIENT] jQuery $.Defferred() is deprecated, use native Promise() instead');

/**
 * @deprecated since v3.8. Will be removed in v4.x. Use native 'Promise.finally' instead
 */
Promise.prototype.always = deprecate(Promise.prototype.finally, '[G3W-CLIENT] jQuery $.Defferred() is deprecated, use native Promise() instead');

/**
 * @deprecated since v3.8. Will be removed in v4.x. Use ESM imports from 'vue-color' instead
 */
window.VueColor = VueColor;

/**
 * @deprecated since v3.8. Will be removed in v4.x. Use require('vue-cookie') instead of window.VueCookie
 */
window.VueCookie = require('vue-cookie');