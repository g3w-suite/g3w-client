/**
 * @file shims legacy variables to ensure backward compatibily with old G3W-CLIENT plugins (eg. window variables)
 * @since v3.8
 */

import * as VueColor from 'vue-color';

const deprecate = require('util-deprecate');

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