var PluginsService = require('g3w/core/pluginsservice');
var PluginsRegistry = require('g3w/core/pluginsregistry');

var Panel = Vue.component('panel',{
    template: require('./panel.html'),
    data: function() {
      return {
        state: PluginsService.state
      }
    },
    computed: {
      //
    },
    methods: {
      //codice qui
    },
    ready: function() {
      //
    }
})

module.exports = new Panel();