var t = require('i18n/i18n.service');
require('g3w/gui/vue.directives');
var isMobileMixin = require('g3w/gui/vue.mixins').isMobileMixin;
var layout = require('./js/layout/layout');
var app = null;
var appService = require('./js/app.service');

var bootstrap = function (baseconfig){
  //creo un filtro vue che traduce il testo passato
  Vue.filter('t', function (value) {
    return t(value);
  });
  
  Vue.mixin(isMobileMixin);
  
  var SidebarComponent = require('g3w-base-app/js/layout/sidebar').SidebarComponent;
  var FloatbarComponent = require('g3w-base-app/js/layout/floatbar').FloatbarComponent;
  var AppUI = require('g3w-base-app/js/app.ui');
  
  var SideBar = SidebarComponent.extend({
    mixins: [isMobileMixin],
    template: baseconfig.templates.sidebar,
  });
  Vue.component('sidebar',SideBar);
  
  var FloatBar = FloatbarComponent.extend({
    template: baseconfig.templates.floatbar,
  });
  Vue.component('floatbar',FloatBar);
  
  var UI = AppUI.extend({
    template: baseconfig.templates.app,
  });
  Vue.component('app',UI);
  
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
      getWmsUrl: baseconfig.getWmsUrl,
      // richiesto da ProjectsRegistry
      getProjectConfigUrl: baseconfig.getProjectConfigUrl,
      plugins: {
        plugins: baseconfig.plugins,
        configs: baseconfig.group.plugins
      },
      tools: baseconfig.tools
    }
  };
  
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
};

module.exports = bootstrap;
