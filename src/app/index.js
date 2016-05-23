$(function (){
  var t = require('i18n.service');
  var isMobileMixin = require('g3w/gui/vue.mixins').isMobileMixin;
  var layout = require('layout/layout');
  var app = null;

  //creo un filtro vue che traduce il testo passato
  Vue.filter('t', function (value) {
    return t(value);
  });
  
  Vue.mixin(isMobileMixin);
  
  var plugins = require('./configs/plugins');
  
  var baseconfig = {
    client: {
      debug: true,
      local: false
    },
    server: {
        urls: {
          ows: '/ows',
          api: '/api',
          config: '/api/config',
          staticurl: ''
        }
    },
    group: null
  };
  
  if (baseconfig.client.debug){
    Vue.config.debug = true;
  }
  
  // genera il config utilizzato che verrà passato da AppService a tutti i servizi G3W
  function createConfig(config){
    return {
      debug: true,
      resourcesurl: baseconfig.server.urls.staticurl,
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
      },
      plugins: {
        plugins: plugins,
        configs: baseconfig.group.plugins
      }
    }
  };
  
  var appUi = require('app.ui');
  var appService = require('app.service');
  
  //inizializza la vue appicazione
  function run(){
    app = new Vue({
      el: 'body',
      ready: function(){
        $(document).localize();
      }
    });
  };
  
  layout.loading();
  
  // i servizi sono stati inizializzati, posso avviare l'istanza Vue
  appService.on('ready',function(){
    run();
  });
  
  // se sto caricando dal client g3w-admin initconfig è già inlined
  if (window.initConfig) {
    baseconfig.server.urls.staticurl = initConfig.staticurl;
    baseconfig.group = window.initConfig.group; // config is inlined by g3w-admin inside the index template as a <script> tag
    var config = createConfig(config);
    appService.init(config);// emette evento ready dopo aver letto la configurazione
  }
  // altrimenti devo aspettare che local.initconfig.js abbia caricato l'initconfig
  else{
    $(document).on('initconfigReady',function(e,initconfig){
      baseconfig.server.urls.staticurl = initconfig.staticurl;
      baseconfig.group = initconfig.group;
      var config = createConfig(config);
      appService.init(config);
    })
  }
  
  
  
});
