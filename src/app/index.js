(function (){
  var t = require('i18n.service');
  var appUi = require('app.ui');
  var appService = require('app.service');
  var app = null;
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
  
  // se sto caricando dal client g3w-admin initconfig è già inlined
  if (window.initConfig) {
    config.group = window.initConfig.group; // config is inlined by g3w-admin inside the index template as a <script> tag
  }
  // altrimenti devo aspettare che local.initconfig.js abbia caricato l'initconfig
  else{
    $(document).on('initconfigReady',function(e,initconfig){
      appService.setGroup(initconfig.group);
    })
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
      },
      ready: function(){
        $(document).localize();
      }
    });
  }

  //inizializzazione del
  appService.setup(config);// emette evento ready dopo aver letto la configurazione
  appService.on('ready',function(){
    run();
  });
})();
