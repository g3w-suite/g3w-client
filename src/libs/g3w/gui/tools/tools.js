var t = require('i18n.service');
var PluginsService = require('g3w/core/pluginsservice');
var PluginsRegistry = require('g3w/core/pluginsregistry');

Vue.component('g3w-tools',{
    template: require('./tools.html'),
    data: function() {
      return {
        store: PluginsRegistry.store
      }
    },
    methods: {
      activeTool: function(pluginName){
        PluginsService.setActiveTool(pluginName);
      }
    }
});