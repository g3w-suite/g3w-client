/**
 * @since.3.9.0
 */
window.Vue = require('vue2/dist/vue.min');
/**
 * @file Expose `window.g3wsdk` variable
 * @since v3.8
 */

/**
 * @since 3.9.0
 */
import _ from 'lodash';

window._ = _;

/**
 * Expose "g3wsdk" variable globally used by plugins to load sdk class and instances
 * 
 * @type {object}
 */
window.g3wsdk = require('app/api');

/**
 * @TODO not yet implemented
 *
 * @see https://github.com/g3w-suite/g3w-client/issues/71
 * @see https://github.com/g3w-suite/g3w-client/issues/46
 */
// window.g3w = window.g3wsdk;