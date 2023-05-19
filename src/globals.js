/**
 * @since 3.9.0
 * @TODO use EventEmitter (better each single method) when necessary and not globally
 */
import EventEmitter from 'eventemitter';

window.EventEmitter = EventEmitter;
/**
 * @since 3.9.0
 * @TODO use lodash (better each single method) when necessary and not globally
 */
import _ from 'lodash';

window._ = _;

/**
 * @since 3.9.0
 * @TODO use $script only when necessary and not globally
 */
import $script from 'scriptjs';

window.$script = $script;

/**
 * @since.3.9.0
 */
window.Vue = require('vue2/dist/vue.min');
/**
 * @file Expose `window.g3wsdk` variable
 * @since v3.8
 */

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