var i18ninit = require('sdk').core.i18n.init;
// oggetto
var ApplicationService = require('sdk/sdk').core.ApplicationService;
// oggetto application template che si occupa di gestire il template dell'applicazione
var ApplicationTemplate = require('./template/js/template');
// configurazione dell'applicazione
var config = require('./config/config.js');
// SETTO LA VARIABILE GLOBALE g3wsdk, COME SE AVESSI USATO sdk.js
window.g3wsdk = require('sdk');
//imposto il timeout delle richieste ajax di jquery
// $.ajaxSetup({
//    timeout: 5000 // in milliseconds
// });
// inizializza l'internalizzazione
i18ninit(config.i18n);

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
    vectorurl:config.server.urls.vectorurl,
    projects: config.group.projects,
    initproject: config.group.initproject,
    overviewproject: (config.group.overviewproject && config.group.overviewproject.gid) ? config.group.overviewproject : null,
    baselayers: config.group.baselayers,
    mapcontrols: config.group.mapcontrols,
    background_color: config.group.background_color,
    crs: config.group.crs,
    proj4: config.group.proj4,
    minscale: config.group.minscale,
    maxscale: config.group.maxscale,
    // richiesto da ProjectService
    getWmsUrl: function(project){
      return config.server.urls.baseurl+config.server.urls.ows+'/'+config.group.id+'/'+project.type+'/'+project.id;
    },
    // richiesto da ProjectsRegistry per acquisire informazioni specifiche del progetto
    getProjectConfigUrl: function(project){
      return config.server.urls.baseurl+config.server.urls.config+'/'+config.group.id+'/'+project.type+'/'+project.id;
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
            collapsible: true, //  i permette di capire se cliccandoci sopra posso lanciare il setOpen del componente
            icon: "fa fa-print"
          }),
          new SearchComponent({
            id: 'search',
            open: false,
            collapsible: true,
            icon: "fa fa-search"
          }),
          new CatalogComponent({
            id: 'catalog',
            open: false,
            collapsible: false,
            icon: "fa fa-map-o"
          }),
          // qui vanno i plugins sotto forma di tools
          new ToolsComponent({
            id: 'tools',
            open: false,
            collapsible: true,
            icon: "fa fa-gears"
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

function sendErrorToApplicationTemplate(reloadFnc,error) {
  if (error && error.responseJSON && error.responseJSON.error.data) {
    error = error.responseJSON.error.data
  } else {
    error = 'Errore di connessione'
  }
  // stato un erore ne caricamento della configurazione del progetto
  // passo la stessa funzione di bootstrap
  ApplicationTemplate.fail(reloadFnc, error);
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
var bootstrap = function() {
  //ottengo al configurazione inizilae del gruppo di progetti
  // config.server.urls.initconfig: è l'api url a cui chiedere la configurazione iniziale
  ApplicationService.obtainInitConfig(config.server.urls.initconfig)
  .then(function(initConfig) {
    // una volta ottenuta la configurazione inziale
    // vado a scrivere gli url dei file statici e del media urld del base url e del vector url
    config.server.urls.baseurl = initConfig.baseurl;
    config.server.urls.staticurl = initConfig.staticurl;
    config.server.urls.clienturl = initConfig.staticurl+initConfig.client;
    config.server.urls.mediaurl = initConfig.mediaurl;
    config.server.urls.vectorurl = initConfig.vectorurl;
    config.group = initConfig.group;
    config.user = initConfig.user;
    var applicationConfig = createApplicationConfig();
    // unavolta ottenuta la configurazione e settetat in modo digeribile all'applicazione
    // la vado a pssare al metodo init dell'application service
    ApplicationService.init(applicationConfig, true) // lancio manualmente il postBootstrp
      .then(function() {
        // andato tutto a buon fine
      })
      .fail(function(error) {
        sendErrorToApplicationTemplate(bootstrap, error);
      })
  })
  .fail(function(error) {
    sendErrorToApplicationTemplate(bootstrap, error);
  })
};

// lancio subito il bootstrap
bootstrap();

