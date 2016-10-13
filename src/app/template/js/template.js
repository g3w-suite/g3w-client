var t = require('sdk/core/i18n/i18n.service').t;
require('sdk/gui/vue/vue.directives');
var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
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
  };
  
  this._buildTemplate = function() {
    var self = this;
    floatbar.FloatbarService.init(layout);
    var placeholdersConfig = this.templateConfig.placeholders;
    _.forEach(placeholdersConfig, function(components, placeholder){
      // per ogni placeholder ci possono essere più componenti ciclo e aggiungo
      self._addComponents(components.components,placeholder);
    });
    //registro altri componenti che non hanno una collocazione spaziale precisa
    // come da esempio i risultati che possono essere montati sulla floatbar o altre parti del template
    this._addOtherComponents();
    this._setViewport(this.templateConfig.viewport);
    this.emit('ready');
    GUI.ready();
  };

  //aggiungere compineti non legati ad un placeholder
  this._addOtherComponents = function() {
    var self = this;
    if (this.templateConfig.othercomponents) {
      self._addComponents(this.templateConfig.othercomponents);
    }
  };

  this._setViewport = function(viewportComponents) {
    if (viewportComponents) {
      ApplicationTemplate.PlaceholdersServices.viewport.addComponents(viewportComponents);
      this._addComponents(viewportComponents);
    }
  };
  
  this._addComponent = function(component,placeholder) {
    this._addComponents([component],placeholder);
  };
  
  this._addComponents = function(components,placeholder) {
    var register = true;
    if (placeholder && ApplicationTemplate.PLACEHOLDERS.indexOf(placeholder) > -1){
      var placeholderService = ApplicationTemplate.PlaceholdersServices[placeholder];
      if (placeholderService) {
        register = placeholderService.addComponents(components);
      }
    }
    _.forEach(components,function(component){
      if (register) {
        ComponentsRegistry.registerComponent(component);
      }
    })
  };
  
  this._removeComponent = function(plceholder,componentId) {
    ComponentsRegistry.unregisterComponent(component);
  };
  
  this._showModalOverlay = function(bool) {
    var mapService = GUI.getComponent('map').getService();
    if (bool) {
      mapService.startDrawGreyCover();
    } else {
      mapService.stopDrawGreyCover();
    }

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
    GUI.layout = layout;
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
    GUI.showResultsFactory = function(type) {
      var showPanelResults;
      switch (type) {
        case 'query':
          //GUI.showFloatbar();
          showPanelResults = GUI.showQueryResults;
          break;
      }
      return showPanelResults;
    };

    GUI.showQueryResults = function(title,results) {
      var queryResultsComponent = GUI.getComponent('queryresults');
      var queryResultService = queryResultsComponent.getService();
      queryResultService.reset();
      //queryResultService.setTitle(title);
      if (results) {
        queryResultService.setQueryResponse(results);
      }
      //rimuovo spinner
      var options = {append: true};
      GUI.showContentAside(queryResultsComponent,"Risultati "+title,false);
      return queryResultService;
    };
    
    GUI.hideQueryResults = _.bind(floatbar.FloatbarService.hidePanel,floatbar.FloatbarService);
    //temporaneo show panel
    GUI.showPanel = _.bind(sidebar.SidebarService.showPanel, sidebar.SidebarService);
    GUI.closePanel = _.bind(sidebar.SidebarService.closePanel, sidebar.SidebarService);
    /* ------------------ */

    toastr.options.positionClass = 'toast-top-center';
    toastr.options.preventDuplicates = true;
    toastr.options.timeOut = 2000;
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
    };
    GUI.hideFloatbar = function() {
      floatbar.FloatbarService.close();
    };

    // SIDEBAR //
    GUI.showSidebar = _.bind(this._showSidebar, this);
    GUI.hideSidebar = _.bind(this._hideSidebar, this);
    
    GUI.setModal = _.bind(this._showModalOverlay,this);

    // Mostra la mappa nascondendo la vista dei contenuti
    GUI.showMap = function(split) {
      GUI.showMapAside(100,split)
    };
    // Mostra la mappa come vista aside (nel caso sia attiva la vista contenuti). Percentuale di default 30%
    GUI.showMapAside = function(perc,split) {
      perc = (typeof perc === 'boolean') ? perc : 30;
      viewport.ViewportService.showMap({
        perc: perc
      })
    };
    // Mostra il contenuto (100%)
    GUI.showContent = function(content,title,split) {
      GUI.showContentAside(content,title,100,split)
    };
    // Aggiunge contenuto allo stack
    GUI.pushContentAside = function(content,title,perc,split) {
      GUI.showContentAside(content,title,true,perc,split);
    };
    // Mostra il contenuto. Il contenuto può essere una string HTML, un elemento DOM o un componente Vue. Percentuale di default 50%
    GUI.showContentAside = function(content,title,push,perc,split) {
      viewport.ViewportService.showContent({
        content: content,
        title: title,
        push: push,
        split: split,
        perc: perc
      });
    };
    /* fine metodi specifici */
    
    /* FINE DEFINIZIONE INTERFACCIA PUBBLICA */
  };
  
  base(this);
};
inherit(ApplicationTemplate,G3WObject);

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

