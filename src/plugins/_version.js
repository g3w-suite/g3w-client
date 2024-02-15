/** START: g3w-client/src/plugins/_version.js */
(function() {
  const plugins = window && window.initConfig && window.initConfig.group && window.initConfig.group.plugins;
  if (plugins) plugins[process.env.g3w_plugin_name] = Object.assign(plugins[process.env.g3w_plugin_name] || {}, {
    version: process.env.g3w_plugin_version,
    hash: process.env.g3w_plugin_hash,
    branch: process.env.g3w_plugin_branch,
  });
})();
/** END: g3w-client/src/plugins/_version.js */