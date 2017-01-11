var i18ninit = require('sdk').core.i18n.init;
// oggetto
var ApplicationService = require('sdk/sdk').core.ApplicationService;
// oggetto application template che si occupa di gestire il template dell'applicazione
var ApplicationTemplate = require('./template/js/template');
// configurazione dell'applicazione
var config = require('./config/config.js');
// SETTO LA VARIABILE GLOBALE g3wsdk, COME SE AVESSI USATO sdk.js
window.g3wsdk = require('sdk');
// questa funzione che ala configurazione inizale dell'applicazione
// tutte le cose in comune

function createApplicationConfig() {
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
    resourcesurl: config.server.urls.clienturl,
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
    views: config.views || {},
    user: config.user || null
  };
}

// questa è la configurazione base del template che conterrà tutti gli
// elementi previsti dal template. Nella definizione sono tutti oggetti vuoti
// Sarà l'applicazione a scegliere di riempire gli elementi
function createTemplateConfig() {
  // recupero i componenti
  var CatalogComponent = require('sdk').gui.vue.CatalogComponent;
  var SearchComponent = require('sdk').gui.vue.SearchComponent;
  var PrintComponent = require('sdk').gui.vue.PrintComponent;
  var ToolsComponent = require('sdk').gui.vue.ToolsComponent;
  var MapComponent = require('sdk').gui.vue.MapComponent;
  var ContentsComponent = require('./template/js/contentsviewer');
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
          new PrintComponent({
            id: 'print',
            open: false,
            collapsable: true,
            icon: "fa fa-print"
          }),
          new SearchComponent({
            id: 'search',
            open: false,
            collapsable: true,
            icon: "fa fa-search"
          }),
          new CatalogComponent({
            id: 'catalog',
            open: false,
            collapsable: false,
            icon: "fa fa-database"
          }),
          new ToolsComponent({
            id: 'tools',
            open: false,
            collapsable: true,
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
    viewport: {
      // placeholder del contenuto (view content) inizialmente Vista Secondaria (nascosta)
      components: {
        map: new MapComponent({
          id: 'map'
        }),
        content: new ContentsComponent({
          id: 'contents'
        })
      }
    }
  }
}

// funzione che ottiene la configurazione dal server
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
        initConfig.clienturl = "../dist/"; // in locale forziamo il path degli asset
        d.resolve(initConfig);
      })
    }
  }
  return d.promise();
}

ApplicationService.on('ready', function() {
  //istanzio l'appication template passando la configurazione
  // del template e l'applicationService che fornisce API del progetto
  var templateConfig = createTemplateConfig();
  //istanzio l'application Template passando il templateconfig, l'applicationservice
  applicationTemplate = new ApplicationTemplate(templateConfig, this);
  //inizializzo e faccio partire con il metodo init
  applicationTemplate.init();
  // quando (dopo la chiamta e il setup del layout etc..) dell'application template
  // è ready lancio l'applicationTemplate service postBoostrat
  applicationTemplate.on('ready', function() {
    ApplicationService.postBootstrap();
  });
});

// funzione che viene lanciata al momento di caricare app.js

bootstrap = function() {
  // inizlaizza l'internalizzazione
  i18ninit(config.i18n);
  //ottengo al configurazione inizilae del gruppo di progetti
  // config.server.urls.initconfig: è l'api url a cui chiedere la configurazione iniziale
  obtainInitConfig(config.server.urls.initconfig)
  .then(function(initConfig) {
    // una volta ottenuta la configurazione inziale
    // vado a scrivere gli url dei file statici e del media url
    config.server.urls.staticurl = initConfig.staticurl;
    config.server.urls.clienturl = initConfig.staticurl+initConfig.client;
    config.server.urls.mediaurl = initConfig.mediaurl;
    config.group = initConfig.group;
    config.user = initConfig.user;
    var applicationConfig = createApplicationConfig();
    // unavolta ottenuta la configurazione e settetat in modo digeribile all'applicazione
    // la vado a pssare al metodo init dell'application service
    ApplicationService.init(applicationConfig, true); // lancio manualmente il postBootstrp
  })
}();


