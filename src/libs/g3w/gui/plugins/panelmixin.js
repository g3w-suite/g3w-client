var PluginsService = require('g3w/core/pluginsservice');
var PluginsRegistry = require('g3w/core/pluginsregistry');

var PanelComponent = Vue.extend({
    data: function() {
      return {
        state: PluginsService.state
      }
    }
})

module.exports = PanelComponent;
