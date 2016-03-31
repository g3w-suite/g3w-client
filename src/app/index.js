(function (){
  var t = require('i18n.service');
  var appUi = require('app.ui');
  var appService = require('app.service');
  var app = null;
  var baseconfig = {
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
  };
  
  // genera il config utilizzato che verrà passato da AppService a tutti i servizi G3W
  function createConfig(config){
    return {
      debug: true,
      projects: baseconfig.group.projects,
      initproject: baseconfig.group.initproject,
      baselayers: baseconfig.group.baselayers,
      crs: baseconfig.group.crs,
      minscale: baseconfig.group.minscale,
      maxscale: baseconfig.group.maxscale,
      // richiesto da ProjectService
      getWmsUrl: function(project){
        return baseconfig.server.urls.ows+'/'+baseconfig.group.id+'/'+project.type+'/'+project.id;
      },
      // richiesto da ProjectsRegistry
      getProjectConfigUrl: function(project){
        return baseconfig.server.urls.config+'/'+baseconfig.group.id+'/'+project.type+'/'+project.id;
      }
    }
  };
  
  if (baseconfig.client.debug){
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
      ready: function(){
        $(document).localize();
      }
    });
  }
  
  // i servizi sono stati inizializzati, posso avviare l'istanza Vue
  appService.on('ready',function(){
    run();
  });
  
  // se sto caricando dal client g3w-admin initconfig è già inlined
  if (window.initConfig) {
    baseconfig.group = window.initConfig.group; // config is inlined by g3w-admin inside the index template as a <script> tag
    var config = createConfig(config);
    appService.init(config);// emette evento ready dopo aver letto la configurazione
  }
  // altrimenti devo aspettare che local.initconfig.js abbia caricato l'initconfig
  else{
    $(document).on('initconfigReady',function(e,initconfig){
      baseconfig.group = initconfig.group;
      var config = createConfig(config);
      appService.init(config);
    })
  }
  
  
  
})();
