var PluginsService = require('g3w/core/pluginsservice');
Vue.component('floatbar',{
    data: {
      store: PluginsService.store
    },
    template: require('./floatbar.html')
});

