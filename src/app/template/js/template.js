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

    var AppUI = require('./applicationui');

    Vue.component('sidebar', sidebar.SidebarComponent);
    Vue.component('viewport', viewport.ViewportComponent);
    Vue.component('floatbar', floatbar.FloatbarComponent);
    Vue.component('app', AppUI);
    //inizializza l'applicazione Vue
    var template = this;  
    var app = new Vue({
      el: 'body',
      ready: function(){
        self._buildTemplate();
        $(document).localize();
      }
    });
  }
  
  this._buildTemplate = function() {
    var self = this;
    floatbar.FloatbarService.init(layout);
    var placeholdersConfig = this.templateConfig.placeholders;
    _.forEach(placeholdersConfig, function(components, placeholder){
      // per ogni placeholder ci possono essere più componenti ciclo e aggiungo
     _.forEach(components.components, function(component){
        self._addComponent(placeholder, component);
      });
    });
    //registro altri componenti che non hanno una collocazione spaziale precisa
    // come da esempio i risultati che possono essere montati sulla floatbar o altre parti del template
    this._addOtherComponents();

    GUI.ready();
  };

  //aggiungere compineti non legati ad un placeholder
  this._addOtherComponents = function() {
    var self = this;
    if (this.templateConfig.othercomponents) {
      _.forEach(this.templateConfig.othercomponents, function(component) {
        self._addComponent('othercomponents', component);
      })
    };
  };
  
  this._addComponent = function(placeholder, component) {
    if (ApplicationTemplate.PLACEHOLDERS.indexOf(placeholder) > -1){
      var placeholderService = ApplicationTemplate.PlaceholdersServices[placeholder];
      if (placeholderService) {
        placeholderService.addComponent(component);
        ComponentsRegistry.registerComponent(component);
      }
    } else { // caso di componenti non placeholder
      ComponentsRegistry.registerComponent(component);
    }
  };
  
  this._removeComponent = function(plceholder,componentId) {
    ComponentsRegistry.unregisterComponent(component);
  };
  
  this._showModalOverlay = function(bool){
    /*if (!this._modalOverlay){
      this._modalOverlay = $('<div id="g3w-modal-overlay" style="background-color: #000000; opacity: 0.7;z-index:4000;position:fixed;top:0px;left:0px"></div>');
      $("body").append(this._modalOverlay);
      this._modalOverlay.width($(window).innerWidth());
      this._modalOverlay.height($(window).innerHeight());
    }
    if (_.isUndefined(bool) || bool === true){
      this._modalOverlay.width($(window).innerWidth());
      this._modalOverlay.height($(window).innerHeight());
      this._modalOverlay.show();
    }
    else {
      this._modalOverlay.hide();
    }*/
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
      return this.ApplicationService.getConfig().resourcesurl;
    },this);
    
    GUI.showForm = _.bind(floatbar.FloatbarService.showPanel,floatbar.FloatbarService);
    GUI.closeForm = _.bind(floatbar.FloatbarService.closePanel,floatbar.FloatbarService);
    GUI.showList = _.bind(floatbar.FloatbarService.showPanel,floatbar.FloatbarService);
    GUI.closeList = _.bind(floatbar.FloatbarService.closePanel,floatbar.FloatbarService);
    GUI.hideList = _.bind(floatbar.FloatbarService.hidePanel,floatbar.FloatbarService);
    
    GUI.showTable = function() {};
    GUI.closeTable = function() {};
    
    // Qui si implementa il metodo per la visualizzazione dei risultati
    // derivanti da una query

    //esempio di metodo generico
    GUI.showResults = function(type) {
      var showPanelResults;
      switch (type) {
        case 'query':
          GUI.showFloatbar();
          showPanelResults = GUI.showQueryResults;
          break;
      };
      return showPanelResults
    };

    GUI.showQueryResults = function(results) {
      // istanziare il componente queryresults
      var queryResultsComponent = GUI.getComponent('queryresults');
      // passarlo a Floatbar
      var queryResultService = queryResultsComponent.getService();
      var queryResults = queryResultService.setResults(results);
      //rimuovo spinner
      GUI.hideSpinner('loadspinner')
      var options = {append: true};
      floatbar.FloatbarService.showPanel(queryResultsComponent, options);
    };
    
    GUI.hideQueryResults = _.bind(floatbar.FloatbarService.hidePanel,floatbar.FloatbarService);
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
    GUI.showSpinner = function(options){
      var container = options.container || 'body';
      var id = options.id || 'loadspinner';
      var where = options.where || 'prepend'; // append | prepend
      var style = options.style || '';
      var transparent = options.transparent ? 'background-color: transparent' : '';
      if (!$("#"+id).length) {
        $(container)[where].call($(container),'<div id="'+id+'" class="spinner-wrapper '+style+'" style="'+transparent+'"><div class="spinner '+style+'"></div></div>');
      }
    };
    GUI.hideSpinner = function(id){
      $("#"+id).remove();
    };
    /* end spinner*/

    /* fine metodi comuni */
    
    /* Metodi specifici del template */
    // FLOATBAR //
    GUI.showFloatbar = function() {
      floatbar.FloatbarService.open();
      GUI.showSpinner({container:'#floatbar-spinner',transparent:true,where:'append'});
    };
    GUI.hideFloatbar = function() {
      floatbar.FloatbarService.close();
    };

    // SIDEBAR //
    GUI.showSidebar = _.bind(this._showSidebar, this);
    GUI.hideSidebar = _.bind(this._hideSidebar, this);
    
    GUI.setModal = _.bind(this._showModalOverlay,this);
    
    // Mostra la mappa come vista principale
    GUI.showMap = function() {
      viewport.ViewportService.setPrimaryComponent('map');
    };
    // Mostra la mappa come vista aside, impostando il rapporto vista principale / vista secondaria (es. 2 per 1/2, 3 per vista secondaria 1/ di quella primaria, ecc.)
    GUI.showMapAside = function(split,ratio) {
      
    };
    // Mostra il contenuto come vista principale. Il contenuto può essere una string HTML, un elemento DOM o un componente Vue
    GUI.showContent = function(content) {
      var contentComponent = ComponentsRegistry.getComponent('content');
      // contentComponent.setContent(content);  DA IMPLEMENTARE: Il secondo componente settato in fase di configurazione (ancora non presente) dovrà implementare il metodo setContent
      // che accetterà o una stringa HTML, o un elemento DOM, oppure un componente Vue
      viewport.ViewportService.setPrimaryComponent('content');
    };
    // Mostra i contenuto come vista aside
    GUI.showContentAside = function(content,split,ratio) {
      var contentComponent = ComponentsRegistry.getComponent('content');
      // contentComponent.setContent(content);
      viewport.ViewportService.setPrimaryComponent('map');
      viewport.ViewportService.showSecondaryView(split,ratio);
    };
    // Nasconde la vista secondaria
    GUI.hideAside = function() {
      viewport.ViewportService.hideSecondaryView();
    }
    
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

