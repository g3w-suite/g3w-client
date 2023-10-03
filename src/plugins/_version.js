/** START: g3w-client/src/plugins/_version.js */
window.initConfig.group.plugins[process.env.g3w_plugin_name] = Object.assign(window.initConfig.group.plugins[process.env.g3w_plugin_name] || {}, { version: process.env.g3w_plugin_version});
/** END: g3w-client/src/plugins/_version.js */