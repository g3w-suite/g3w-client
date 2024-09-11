/**
 * @file common vue instances used to watch object changes or to emit events
 * 
 * NB: node.js modules are singletons by default.
 * 
 * @see https://medium.com/@lazlojuly/are-node-js-modules-singletons-764ae97519af
 * 
 * @since 3.11.0
 */

/**
 * ORIGINAL SOURCE: src/app/g3w-ol/constants.js@3.8.6
 */
export const VM = new Vue();