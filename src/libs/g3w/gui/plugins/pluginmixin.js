var t = require('i18n.service');
var PluginsService = require('g3w/core/pluginsservice');
var PluginsRegistry = require('g3w/core/pluginsregistry');
// define a mixin object
var pluginMixin = {

  methods: {
    activePlugin: function(pluginName){
      PluginsService.setActivePlugin(pluginName);
      var panel = new toolsPanel[pluginName];
      panel.$mount().$appendTo('#g3w-panel');
      PluginsService.setActivePanel(panel);
    }
  }
}

module.exports = pluginMixin;