var i18ninit = require('sdk').core.i18n.init;
var ApplicationService = require('sdk/sdk').core.ApplicationService;
var ApplicationTemplate = require('./template/js/template');

// SETTO LA VARIABILE GLOBALE g3wsdk, COME SE AVESSI USATO sdk.js
window.g3wsdk = require('sdk');

var config = require('./config/config.js');

// funzione temporanea che aggiunge il plugin (configurazioni) per caricare
// il plugin geonodes con il layer accessi
function aggiungiGeonodesPlugin(plugins) {

  var pluginGeonodeObj = _.cloneDeep(plugins.iternet);
  plugins.geonotes = pluginGeonodeObj;
  return plugins;
}

function createApplicationConfig() {
  //aggiungo temporaneamente il plugin Geodotes
  //aggiungiGeonodesPlugin(config.group.plugins);
  return {
    apptitle: config.apptitle || '',
    logo_img: config.group.header_logo_img,
    logo_link: config.group.header_logo_link,
    terms_of_use_text: config.group.header_terms_of_use_text,
    terms_of_use_link: config.group.terms_of_use_link,
    debug: config.client.debug || false,
    group: config.group,
    urls: config.server.urls,
    mediaurl: config.server.urls.mediaurl,
    resourcesurl: config.server.urls.staticurl,
    projects: config.group.projects,
    initproject: config.group.initproject,
    overviewproject: config.group.overviewproject,
    baselayers: config.group.baselayers,
    mapcontrols: config.group.mapcontrols,
    background_color: config.group.background_color,
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
    plugins: config.group.plugins,
    tools: config.tools,
    views: config.views || {}
  };
};

// questa è la configurazione base del template che conterrà tutti gli
// elementi previsti dal template. Nella definizione sono tutti oggetti vuoti
// Sarà l'applicazione a scegliere di riempire gli elementi
function createTemplateConfig(){
  var CatalogComponent = require('sdk').gui.vue.CatalogComponent;
  var SearchComponent = require('sdk').gui.vue.SearchComponent;
  var ToolsComponent = require('sdk').gui.vue.ToolsComponent;
  var MapComponent = require('sdk').gui.vue.MapComponent;
  var ContentsComponent = require('./template/js/contents');
  //al momento si utilizza quesllo quenerico ma si potrebbe costruire un componente
  //ad hoc per i risultati
  var QueryResultsComponent = require('sdk').gui.vue.QueryResultsComponent;
  
  return {
    title: config.apptitle,
    placeholders: {
      navbar: {
        components: []
      },
      sidebar: {
        components: [
          new SearchComponent({
            id: 'search',
            open: false,
            icon: "fa fa-search"
          }),
          new CatalogComponent({
            id: 'catalog',
            open: true,
            icon: "fa fa-database"
          }),
          new ToolsComponent({
            id: 'tools',
            open: false,
            icon: "fa fa-gear"
          })
        ]
      },
      floatbar:{
        components: []
      }
    },
    othercomponents: [
      new QueryResultsComponent({
          id: 'queryresults'
      })
    ],
    viewport: { // placeholder del contenuto (view content) inizialmente Vista Secondaria (nascosta)
      map: new MapComponent({
        id: 'map'
      }),
      content: new ContentsComponent({
        id: 'contents'
      })
    }
  };
}

function obtainInitConfig(initConfigUrl) {

  var d = $.Deferred();
  //se esiste un oggetto globale initiConfig
  //risolvo con quell'oggetto
  if (window.initConfig) {
    return d.resolve(window.initConfig);
  }
  // altrimenti devo prenderlo dal server usando il percorso indicato in ?project=<percorso>
  else{
    var projectPath;
    var queryTuples = location.search.substring(1).split('&');
    _.forEach(queryTuples, function(queryTuple) {
      //se esiste la parola project nel url
      if (queryTuple.indexOf("project") > -1) {
        //prendo il valore del path progetto (nomeprogetto/tipoprogetto/idprogetto)
        //esempio comune-di-capannori/qdjango/22/
        projectPath = queryTuple.split("=")[1];
      }
    });
    if (projectPath){
      var initUrl = initConfigUrl;
      if (projectPath) {
        initUrl = initUrl + '/' + projectPath;
      }
      //recupro dal server la configurazione di quel progetto
      $.get(initUrl, function(initConfig) {
        //initConfig è l'oggetto contenete:
        //group, mediaurl, staticurl, user
        initConfig.staticurl = "../dist/"; // in locale forziamo il path degli asset
        d.resolve(initConfig);
      })
    }
  }
  return d.promise();
}

ApplicationService.on('ready',function(){
  //istanzio l'appication template passando la configurazione del template e l'applicationService che fornisce API del progetto
  var templateConfig = createTemplateConfig();
  //istanzio l'application Template
  applicationTemplate = new ApplicationTemplate(templateConfig, this);
  applicationTemplate.on('ready',function(){
    ApplicationService.postBootstrap();
  })
  //inizializzo e faccio partire con il metodo init
  applicationTemplate.init();
});

bootstrap = function(){
  i18ninit(config.i18n);
  obtainInitConfig(config.server.urls.initconfig)
  .then(function(initConfig) {
    config.server.urls.staticurl = initConfig.staticurl;
    config.server.urls.mediaurl = initConfig.mediaurl;
    config.group = initConfig.group;
    var applicationConfig = createApplicationConfig();
    ApplicationService.init(applicationConfig, true); // lancio manualmente il postBootstrp
  })
}();


