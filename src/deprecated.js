/**
 * @file shims legacy variables to ensure backward compatibily with old G3W-CLIENT plugins (eg. window variables)
 * @since v3.8
 */

/**
 * Add babel runtime support for compiled/transpiled async functions
 * 
 * @TODO check if this still useful nowdays (IE 11 ?)
 */
import "regenerator-runtime";

import * as VueColor from 'vue-color';

/**
 * @deprecated since v3.8. Will be removed in v4.x. Use ESM imports from 'vue-color' instead
 */
window.VueColor = VueColor;

/**
 * @deprecated since v3.8. Will be removed in v4.x. Use require('vue-cookie') instead of window.VueCookie
 */
window.VueCookie = require('vue-cookie');