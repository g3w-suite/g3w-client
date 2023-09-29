/** START: g3w-client/src/plugins/_version.js */

const g3w          = window.g3wsdk || {};
g3w.loaded_plugins = window.g3wsdk.loaded_plugins || {};

g3w.loaded_plugins[process.env.plugin_name] = process.env.plugin_version;

/** END: g3w-client/src/plugins/_version.js */
