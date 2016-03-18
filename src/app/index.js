var t = require('i18n.service');
var appUi = require('app.ui');
var appService = require('app.service');
var app = null;

/* example of configuration in line */


var config = {
  client: {
    debug: true,
    local: false
  },
  server: {
      urls: {
        ows: '/ows',
        api: '/api',
        config: '/api/config'
      }
  },
  group: null
}

if (config.client.local) {
  config.group = require('./test.inline_config').group;
}
else {
  config.group = initConfig.group; // config is inlined by g3w-admin inside the index template as a <script> tag
}

if (config.client.debug){
  Vue.config.debug = true;
}

Vue.filter('t', function (value) {
  return t(value);
});

function run(){
  app = new Vue({
    el: 'body',
    data: {
      iface: appService
    }
  });
  
  // test aggiornamento albero
  setTimeout(function(){
    var layersRegistry = require('g3w/core/layers/layersregistry');
    var tree = layersRegistry.getLayersTree();
    tree[0].title = "POI";
  },5000)
}

(function (){
  appService.setup(config);
  appService.on('ready',function(){
    run();
  });
})();
