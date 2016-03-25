var PluginsRegistry = require('g3w/core/pluginsregistry');
var PluginsModule = require('./pluginsmodules');
var PluginsService = require('g3w/core/pluginsservice');

Vue.component('g3w-tools',{
    template: require('./plugins.html'),
    data: function() {
      return {
        state: PluginsRegistry.state
      }
    },
    ready: function() {
      var plugin;
      this.state.plugins.forEach(function(_plugin){
        plugin = PluginsModule.getPluginModule(_plugin.name);
        plugin = new plugin;
        plugin.$mount().$appendTo('#tools');
      })
    }
});
