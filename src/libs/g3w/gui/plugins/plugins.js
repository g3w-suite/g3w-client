var PluginsRegistry = require('g3w/core/pluginsregistry');
Vue.component('g3w-toolsTest',{
    template: require('./plugins.html'),
    data: function() {
      return {
        state: PluginsRegistry.state
      }
    },
    components: function() {

      return require('g3w/gui/plugins/info/plugin')

    }
});
