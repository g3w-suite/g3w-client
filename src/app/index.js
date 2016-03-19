var t = require('i18n.service');
var appUi = require('app.ui');
var appService = require('app.service');
var app = null;
//oggetto configurazione
var config = {
  client: {
    debug: true,
    local: true
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
//in caso di test carico la configurazione di test
if (config.client.local) {
  config.group = require('./test.inline_config').group;
}
else {
  config.group = initConfig.group; // config is inlined by g3w-admin inside the index template as a <script> tag
}

if (config.client.debug){
  Vue.config.debug = true;
}
//creo un filtro vue che traduce il testo passato
Vue.filter('t', function (value) {
  return t(value);
});
//inizializza la vue appicazione
function run(){
  app = new Vue({
    el: 'body',
    data: {
      iface: appService
    }
  });
}

(function (){
  //inizializzazione del
  appService.setup(config);// emette evento ready dopo aver letto la configurazione
  appService.on('ready',function(){
    run();
  });
})();
