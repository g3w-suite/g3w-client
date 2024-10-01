/**
 * @file Store G3W-CLIENT plugins (editing, qplotly, qtimeseries, ...)
 * @since v3.6
 */

import G3WObject from 'g3w-object';

/**
 * Object where store plugin
 *   key   = plugin name
 *   value = plugin instance
 * 
 * @since 3.11.0
 */
const PLUGINS = {};

export default Object.assign(new G3WObject, { setters: {
    /** store plugin into registry (if not already registered) */
    registerPlugin(plugin) { PLUGINS[plugin.name] = PLUGINS[plugin.name] || plugin; },
  },
  /** @returns Plugin instance */
  getPlugin(name) {
    return PLUGINS[name];
  },
});