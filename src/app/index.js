const i18ninit = require('sdk').core.i18n.init;
const t = require('sdk').core.i18n.t;
const ApplicationService = require('sdk/sdk').core.ApplicationService;
// ApplicationTemplate instance. It manages the application template
const ApplicationTemplate = require('./template/js/template');
// Main applcation config file
const config = require('./config/config.js');
// set the global enviromental variable g3wsdk. It used by plugins to load sdk class and instances
window.g3wsdk = require('sdk');

// main function to create the start application configuration
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
    main_map_title: config.main_map_title,
    // needed by ProjectService
    getWmsUrl: function(project){
      return config.server.urls.baseurl+config.server.urls.ows+'/'+config.group.id+'/'+project.type+'/'+project.id;
    },
    // needed by ProjectsRegistry to get informations about project configuration
    getProjectConfigUrl: function(project){
      return config.server.urls.baseurl+config.server.urls.config+'/'+config.group.id+'/'+project.type+'/'+project.id;
    },
    plugins: config.group.plugins,
    tools: config.tools,
    views: config.views || {},
    user: config.user || null
  };
}

// this is a base template configuration. It store all the elements
// useful for the template. Att begin will be empty objects
// Application will set only the required element
function createTemplateConfig() {
  // get sdk componets
  const CatalogComponent = require('sdk').gui.vue.CatalogComponent;
  const SearchComponent = require('sdk').gui.vue.SearchComponent;
  const PrintComponent = require('sdk').gui.vue.PrintComponent;
  const MetadataComponent = require('sdk').gui.vue.MetadataComponent;
  const ToolsComponent = require('sdk').gui.vue.ToolsComponent;
  const MapComponent = require('sdk').gui.vue.MapComponent;
  const ContentsComponent = require('./template/js/contentsviewer');
  const QueryResultsComponent = require('sdk').gui.vue.QueryResultsComponent;
  return {
    title: config.apptitle,
    placeholders: {
      navbar: {
        components: []
      },
      sidebar: {
        components: [
          new MetadataComponent({
            id: 'metadata',
            open: false,
            collapsible: false,
            context: false,
            icon: "fa fa-file-code-o"
          }),
          new PrintComponent({
            id: 'print',
            open: false,
            collapsible: true, //  it used to manage click event if can run setOpen component method
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
          // Component that store plugins
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
      // placeholder of the content (view content). Secodary view (hidden)
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

function sendErrorToApplicationTemplate(reloadFnc, lng, error) {
  if (error && error.responseJSON && error.responseJSON.error.data) {
    error = error.responseJSON.error.data
  } else {
    error = null
  }
  ApplicationTemplate.fail(reloadFnc, lng, error);
}

ApplicationService.on('ready', function() {
  //create the ApplicationTemplate instance passing the template configuration
  // and the applicationService instance that is useful to work with project API
  const templateConfig = createTemplateConfig();
  applicationTemplate = new ApplicationTemplate(templateConfig, this);
  // Listen ready event emit after build interface
  applicationTemplate.on('ready', function() {
    ApplicationService.postBootstrap()
  });
  //call initialize applicationTemplate method
  applicationTemplate.init();
});

// frun when app.js is loaded
const bootstrap = function() {
  //get all configuration from groups
  //config.server.urls.initconfig: api url to get starting configuration
  ApplicationService.obtainInitConfig(config.server.urls.initconfig)
  //returna promise with starting configuration
  .then(function(initConfig) {
    // write urls of static files and media url (base url and vector url)
    config.server.urls.baseurl = initConfig.baseurl;
    config.server.urls.frontendurl = initConfig.frontendurl;
    config.server.urls.staticurl = initConfig.staticurl;
    config.server.urls.clienturl = initConfig.staticurl+initConfig.client;
    config.server.urls.mediaurl = initConfig.mediaurl;
    config.server.urls.vectorurl = initConfig.vectorurl;
    config.main_map_title = initConfig.main_map_title;
    config.group = initConfig.group;
    config.user = initConfig.user;
    // get language from server
    config.i18n.lng = config.user.i18n;
    // create application configuration
    const applicationConfig = createApplicationConfig();
    // inizialize internalization
    i18ninit(config.i18n);
    // set accept-language reuest header based on config language
    //jquery
    const language_header = config.i18n.lng || 'en';
    $.ajaxSetup({
      beforeSend: function (jqXHR) {
        jqXHR.setRequestHeader('Accept-Language', language_header);
      }
    });
    ApplicationService.init(applicationConfig, true) // lunch manuallythe postBootstrp
      .then(function() {
        $.extend( true, $.fn.dataTable.defaults, {
          "language": {
            "paginate": {
              "previous": t("dataTable.previous"),
              "next": t("dataTable.next"),
            },
            "info": t("dataTable.info")
          }
        });
      })
      .fail(function(error) {
        const language_header = config.i18n.lng || 'en';
        sendErrorToApplicationTemplate(bootstrap, language_header, error);
      })
  })
  .fail(function(error) {
    const language_header = config.i18n.lng || 'en';
    // inizialize internalization
    sendErrorToApplicationTemplate(bootstrap, language_header, error);
  })
};

// run  bootstrap function
bootstrap();

