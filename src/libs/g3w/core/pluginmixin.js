var t = require('i18n.service');
var PluginsService = require('./pluginsservice');
var PluginsModule = require('./pluginsmodules');

// define a mixin object
var pluginMixin = {
  methods: {
    activePlugin: function(pluginName){
      console.log(pluginName)
      PluginsService.setActivePlugin(pluginName);
      var panel = PluginsModule.getPluginPanel(pluginName);
      panel = new panel();
      panel.$mount().$appendTo('#g3w-panel');
      PluginsService.setActivePanel(panel);
    }
  }
}

module.exports = pluginMixin;