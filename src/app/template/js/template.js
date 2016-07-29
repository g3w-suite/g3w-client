var t = require('sdk/core/i18n/i18n.service').t;
require('sdk/gui/vue/vue.directives');
var ComponentsRegistry = require('sdk/gui/componentsregistry');
var GUI = require('sdk/gui/gui');
// temporaneo per far funzionare le cose
var config = {
    client:{}
};

var sidebar = require('./sidebar');
var floatbar = require('./floatbar');
var viewport = require('./viewport');
var AppUI = require('./applicationui');
var layout = require('./layout');

// forse da trovare un posto migliore per attivare lo spinner iniziale...
layout.loading();

var ApplicationTemplate = function(templateConfig, ApplicationService) {
  self = this;
  this.templateConfig = templateConfig;
  this.ApplicationService = ApplicationService;
  
  this.init = function() {
    var config = ApplicationService.getConfig();
    if (config.debug){
      Vue.config.debug = true;
    }
    this._setupInterface();
    this._setupLayout();
  };
  
  this._setupLayout = function(){  
    Vue.filter('t', function (value) {
      return t(value);
    });

    var SidebarComponent = require('./sidebar').SidebarComponent;
    var FloatbarComponent = require('./floatbar').FloatbarComponent;
    var AppUI = require('./applicationui');

    Vue.component('sidebar', SidebarComponent);
    Vue.component('floatbar', FloatbarComponent);
    Vue.component('app', AppUI);

    //inizializza l'applicazione Vue
    var template = this;  
    var app = new Vue({
      el: 'body',
      ready: function(){
        $(document).localize();
        self._buildTemplate();
      }
    });
  }
  
  this._buildTemplate = function() {
    var self = this;
    var placeholdersConfig = this.templateConfig.placeholders;
    _.forEach(placeholdersConfig, function(components, placeholder){
      // per ogni placeholder ci possono essere più componenti ciclo e aggiungo
     _.forEach(components.components, function(component){
        self._addComponent(placeholder, component);
      });
    });
    //var mapComponent = this.templateConfig.viewport.map;
    //ViewportService.init(mapComponent,null);
    GUI.ready();
  };
  
  this._addComponent = function(placeholder, component) {
    if (ApplicationTemplate.PLACEHOLDERS.indexOf(placeholder) > -1){
      var placeholderService = ApplicationTemplate.PlaceholdersServices[placeholder];
      if (placeholderService) {
        placeholderService.addComponent(component);
        ComponentsRegistry.registerComponent(component);
      }
    }
  };
  
  this._removeComponent = function(plceholder,componentId) {
    ComponentsRegistry.unregisterComponent(component);
  };

  this._showSidebar = function() {
    //codice qui
  };
  this._hideSidebar = function() {
    //codice qui
  };
  
  this._setupInterface = function() {
    /* DEFINIZIONE INTERFACCIA PUBBLICA */
    
    /* Metodi comuni a tutti i template */
    
    GUI.addComponent = _.bind(this._addComponent, this);
    GUI.removeComponent = _.bind(this._removeComponent, this);
    
    /* Metodi da definire (tramite binding) */
    GUI.getResourcesUrl = _.bind(function() {
      return this.ApplicationService.config.resourcesurl;
    },this);
       

    GUI.showForm = function() {};
    GUI.closeForm = function() {};
    GUI.showList = function() {};
    GUI.closeList = function() {};
    GUI.showTable = function() {};
    GUI.closeTable = function() {};

    //temporaneo show panel
    GUI.showPanel = _.bind(sidebar.SidebarService.showPanel, sidebar.SidebarService);
    GUI.closePanel = _.bind(sidebar.SidebarService.closePanel, sidebar.SidebarService);
    /* ------------------ */

    toastr.options.positionClass = 'toast-top-center';
    toastr.options.preventDuplicates = true;
    // proxy della libreria toastr
    GUI.notify = toastr;
    // proxy della libreria bootbox
    GUI.dialog = bootbox;
    /* spinner */
    GUI.showSpinner = function() {};
    GUI.hideSpinner = function() {};
    /* end spinner*/

    /* fine metodi comuni */
    
    /* Metodi specifici del template */
    
    GUI.showFloatbar = function() {};
    GUI.hideFloatbar = function() {};
    
    GUI.showSidebar = _.bind(this._showSidebar, this);
    GUI.hideSidebar = _.bind(this._hideSidebar, this);
    
    // Mostra la mappa come vista principale
    GUI.showMap = function() {};
    // Mostra la mappa come vista aside, impostando il rapporto vista principale / vista secondaria (es. 2 per 1/2, 3 per vista secondaria 1/ di quella primaria, ecc.)
    GUI.showMapAside = function() {ratio};
    // Mostra il contenuto come vista principale. Il contenuto può essere una string HTML, un elemento DOM o un componente Vue
    GUI.showContent = function(content) {};
    // Mostra i contenuto come vista aside
    GUI.showContentAside = function() {content,ratio};
    
    /* fine metodi specifici */
    
    /* FINE DEFINIZIONE INTERFACCIA PUBBLICA */
  };
  
};

ApplicationTemplate.PLACEHOLDERS = [
  'navbar',
  'sidebar',
  'viewport',
  'floatbar'
];

ApplicationTemplate.PlaceholdersServices = {
  navbar: null,
  sidebar: sidebar.SidebarService,
  viewport: viewport.ViewportService,
  floatbar: sidebar.FloatbarService,
};

module.exports =  ApplicationTemplate;

