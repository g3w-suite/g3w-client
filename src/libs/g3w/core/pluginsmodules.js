var PluginsModule = {
  modules: [
    {
      name: 'info',
      pluginModule: require('g3w/gui/plugins/info/plugin'),
      panelModule: require('g3w/gui/plugins/info/panel')
    },
    {
      name: 'editor',
      pluginModule: require('g3w/gui/plugins/editor/plugin'),
      panelModule: require('g3w/gui/plugins/editor/panel')
    }
  ],
  getPluginModule: function(moduleName) {
    var tool = false;
    this.modules.forEach(function(_module) {
      if (moduleName == _module.name) {
          tool = _module.pluginModule;
      }
    });
    return tool
  },
  getPluginPanel: function(panelName) {
    var panel = false;
    this.modules.forEach(function(_module) {
      if (panelName == _module.name) {
          panel = _module.panelModule;
      }
    });
    return panel
  }
}

module.exports = PluginsModule;