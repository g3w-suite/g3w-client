var PluginsService = require('g3w/core/pluginsservice');
Vue.component('floatbar',{
    data: function(){
      return  { 
        store: PluginsService.store
      }
    },
    template: require('./floatbar.html')
});

