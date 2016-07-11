var i18ninit = require('sdk/core/i18n/i18n.service').init;
var config = require('./config/config.js');
var TemplateConfig = ('./config/config.template.js');
var ApplicationService = require('sdk/sdk').core.Application;
var ApplicationTemplate = require('./template/js/template');

i18ninit(baseconfig.i18n);

function createConfig(config){
    return {
      debug: baseconfig.client.debug || false,
      group: null,
      urls: baseconfig.server.urls,
      resourcesurl: baseconfig.server.urls.staticurl,
      projects: baseconfig.group.projects,
      initproject: baseconfig.group.initproject,
      baselayers: baseconfig.group.baselayers,
      crs: baseconfig.group.crs,
      proj4: baseconfig.group.proj4,
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
      tools: baseconfig.tools,
      views: baseconfig.views || {},
      map: baseconfig.map
    }
  };
  
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
      run()
    })
  }

ApplicationService.on('ready',function(){
  //istanzio l'appication template
  applicationTemplate = new ApplicationTemplate();
  //passo la configurazione del template e l'applicationService che fornisce API del progetto
  applicationTemplate.init(ApplicationService,TemplateConfig);
});

ApplicationService.init();

/*
$(function (){
  config.getWmsUrl = function(project){
    return config.server.urls.ows+'/'+config.group.id+'/'+project.type+'/'+project.id;
  };
  config.getProjectConfigUrl = function(project){
    return config.server.urls.config+'/'+config.group.id+'/'+project.type+'/'+project.id;
  }
});
*/

/* -----------------------------------------------------------------------------------------*/


/*Application.init(config);
Application.on('ready', function(){
  // vado a inizializzare il template utilizzando il TemplateService e la configurazione passata da config
  Template.init(config.template);

});*/

