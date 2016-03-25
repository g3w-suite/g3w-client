var t = require('i18n.service');
var PluginsService = require('g3w/core/pluginsservice');
var ToolsPanels = require('./pluginsmodules');

var pluginMixinComponent = Vue.extend({
  methods: {
    activePlugin: function(pluginName){
      console.log(ToolsPanels)
      PluginsService.setActivePlugin(pluginName);
      var panel = ToolsPanels.getPluginPanel(pluginName);
      panel = new panel();
      panel.$mount().$appendTo('#g3w-panel');
      PluginsService.setActivePanel(panel);
    }
  }
})

module.exports = pluginMixinComponent;