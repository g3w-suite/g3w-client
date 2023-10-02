/** START: g3w-client/src/plugins/_version.js */
window.g3wsdk.core.plugin.PluginsRegistry.onbefore('registerPlugin', plugin => plugin._version = process.env.plugin_version);
/** END: g3w-client/src/plugins/_version.js */
