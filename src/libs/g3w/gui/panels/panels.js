var t = require('i18n.service');
var PluginsService = require('g3w/core/pluginservices');

Vue.component('g3w-panels',{
    template: require('./catalog.html'),
    data: function() {
      return {
        store: ProjectService.store
      }
    },
    computed: {
      layerstree: function(){
        console.log("watcher");
        return this.store.layersTree;
      }
    },
    methods: {
      //codice qui
    },
    ready: function() {
      //
    }
});