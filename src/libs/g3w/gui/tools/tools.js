var t = require('i18n.service');
var PluginsService = require('g3w/core/pluginsservice');
var PluginsRegistry = require('g3w/core/pluginsregistry');
var toolsPanel = require('../tools-panel/tools-panel');

Vue.component('g3w-tools',{
    template: require('./tools.html'),
    data: function() {
      return {
        state: PluginsRegistry.state
      }
    },
    methods: {
      activeTool: function(pluginName){
        PluginsService.setActivePlugin(pluginName);
        var panel = new toolsPanel[pluginName];
        pippo = panel;
        panel.$mount().$appendTo('#g3w-panel');
        PluginsService.setActivePanel(panel);
      }
    }
});
