var t = require('i18n.service');
var appUi = require('app.ui');
var appService = require('app.service');
var app = null;
Vue.config.debug = true;

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
  appService.setup();
  appService.on('ready',function(){
    run();
  });
})();
