var i18ninit = require('sdk').core.i18n.init;
var ApplicationService = require('sdk/sdk').core.ApplicationService;
var ApplicationTemplate = require('./template/js/template');

var config = require('./config/config.js');

function createApplicationConfig() {  
  return {
    apptitle: config.apptitle || '',
    debug: config.client.debug || false,
    group: config.group,
    urls: config.server.urls,
    resourcesurl: config.server.urls.staticurl,
    projects: config.group.projects,
    initproject: config.group.initproject,
    baselayers: config.group.baselayers,
    crs: config.group.crs,
    proj4: config.group.proj4,
    minscale: config.group.minscale,
    maxscale: config.group.maxscale,
    // richiesto da ProjectService
    getWmsUrl: function(project){
      return config.server.urls.ows+'/'+config.group.id+'/'+project.type+'/'+project.id;
    },
    // richiesto da ProjectsRegistry
    getProjectConfigUrl: function(project){
      return config.server.urls.config+'/'+config.group.id+'/'+project.type+'/'+project.id;
    },
    plugins: {
      plugins: config.plugins,
      configs: config.group.plugins
    },
    tools: config.tools,
    views: config.views || {},
    map: config.map
  };
};

// questa è la configurazione base del template che conterrà tutti gli
// elementi previsti dal template. Nella definizione sono tutti oggetti vuoti
// Sarà l'applicazione a scegliere di riempire gli elementi
function createTemplateConfig(){
  var CatalogComponent = require('sdk').gui.vue.VueCatalogComponent;
  
  return {
    title: config.apptitle,
    placeholders: {
      navbar: {
        components: []
      },
      sidebar: {
        components: [
          new CatalogComponent,
        ]
      },
      map: null, // placeholder della mappa principale (view map)  inizialmente Vista Primaria
      content: null, // placeholder del contenuto (view content) inizialmente Vista Secondaria (nascosta)
      floatbar:{
        components: []
      }
    }
  };
}

function obtainInitConfig(){
  var d = $.Deferred();
  if (window.initConfig) {
    return d.resolve(window.initConfig);
  }
  // altrimenti devo aspettare che local.initconfig.js abbia caricato l'initconfig
  else{
    $(document).on('initconfigReady',function(e,initconfig){
      return d.resolve(initconfig);
    })
  }
  return d.promise();
}

ApplicationService.on('ready',function(){
  //istanzio l'appication template
  applicationTemplate = new ApplicationTemplate();
  //passo la configurazione del template e l'applicationService che fornisce API del progetto
  applicationTemplate.init(this,templateConfig);
});

bootstrap = function(){
  i18ninit(config.i18n);

  obtainInitConfig()
  .then(function(initConfig){
    config.server.urls.staticurl = initConfig.staticurl;
    config.group = initConfig.group;
    
      var applicationConfig = createApplicationConfig();
      ApplicationService.init(applicationConfig);
  })
}();


