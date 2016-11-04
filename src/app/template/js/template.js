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
  this.init = function() {
    var config = ApplicationService.getConfig();
    if (config.debug){
      Vue.config.debug = true;
    }
    // fa il setup dell'interfaccia
    // dichiarando i metodi generali dell'applicazione GUI.showForm etc ..
    this._setupInterface();
    // fa il setup del layout
    this._setupLayout();
    //vado a registrare tutti i servizi dell'appilazione
    this._setUpServices();
  };
  // setup layout
  // funzione che registra i componenti vue dell'applicazione
  this._setupLayout = function(){
    Vue.filter('t', function (value) {
      return t(value);
    });
    // Inizializzo i componenti vue dell'applicazione
    // preima che venga istanziato l'oggetto vue padre
    Vue.component('sidebar', sidebar.SidebarComponent);
    Vue.component('viewport', viewport.ViewportComponent);
    Vue.component('floatbar', floatbar.FloatbarComponent);
    Vue.component('app', AppUI);
    //inizializza l'applicazione Vue oggetto vue padre dell'applicazione
    var app = new Vue({
      el: 'body',
      ready: function() {
        // inzio a costruire il template
        self._buildTemplate();
        // faccio il localize
        $(document).localize();
      }
    });
  };
  this._setUpServices = function() {
    _.forEach(ApplicationTemplate.Services, function(service, element) {
      console.log(element);
      ApplicationService.registerService(element, service);
    });
  };
  // funzione che costruice il template
  this._buildTemplate = function() {
    var self = this;
    floatbar.FloatbarService.init(layout);
    var placeholdersConfig = this.templateConfig.placeholders;
    _.forEach(placeholdersConfig, function(components, placeholder) {
      // per ogni placeholder ci possono essere più componenti ciclo e aggiungo
      self._addComponents(components.components, placeholder);
    });
    //registro altri componenti che non hanno una collocazione spaziale precisa
    // come da esempio i risultati, form  che possono essere montati sulla floatbar o altre parti del template
    this._addOtherComponents();
    // setto la viewport
    this._setViewport(this.templateConfig.viewport);
    this.emit('ready');
    GUI.ready();
  };

  //aggiungere compineti non legati ad un placeholder
  this._addOtherComponents = function() {
    var self = this;
    // verifico che ci siano altrimcomponenti rispetto a quelli in posizione standard
    if (this.templateConfig.othercomponents) {
      self._addComponents(this.templateConfig.othercomponents);
    }
  };
  // metodo per il setting della vieport
  this._setViewport = function(viewportOptions) {
    // sono passati i componenti della viewport
    // es.:
    /*
    {
     components: {
       map: new MapComponent({
        id: 'map'
       }),
       content: new ContentsComponent({
        id: 'content',
       })
     }
   }
   */
    if (viewportOptions) {
      ApplicationTemplate.Services.viewport.init(viewportOptions);
      this._addComponents(viewportOptions.components);
    }
  };
  // aggiunge componente al template
  this._addComponent = function(component, placeholder) {
    this._addComponents([component], placeholder);
  };
  // aggiunge componenti al template
  this._addComponents = function(components, placeholder) {
    var register = true;
    // qui entro solo e soltanto con i componeti dei placeholders previsti
    if (placeholder && ApplicationTemplate.PLACEHOLDERS.indexOf(placeholder) > -1) {
      var placeholderService = ApplicationTemplate.Services[placeholder];
      if (placeholderService) {
        register = placeholderService.addComponents(components);
      }
    }
    _.forEach(components, function(component) {
      // verifico se è stato registrato
      // nel cosa in cui non è stato registrato (esempio caso otherscomponents)
      if (register) {
        // registro il componente
        ComponentsRegistry.registerComponent(component);
      }
    })
  };
  // rimuovo il componente andando a toglierlo al component registry
  this._removeComponent = function(placeholder, componentId) {
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
  // setup dell'interfaccia dell'applicazione
  // qui definisco i metodi generali dell'applicazione
  // per poter interagire con essa attraverso maggiormente con l'oggetto GUI
  this._setupInterface = function() {
    /* DEFINIZIONE INTERFACCIA PUBBLICA */

    /* Metodi comuni a tutti i template */
    GUI.layout = layout;
    GUI.addComponent = _.bind(this._addComponent, this);
    GUI.removeComponent = _.bind(this._removeComponent, this);
    /* Metodi da definire (tramite binding) */
    GUI.getResourcesUrl = _.bind(function() {
      return ApplicationService.getConfig().resourcesurl;
    },this);
    //LIST
    GUI.showList = _.bind(floatbar.FloatbarService.showPanel, floatbar.FloatbarService);
    GUI.closeList = _.bind(floatbar.FloatbarService.closePanel, floatbar.FloatbarService);
    GUI.hideList = _.bind(floatbar.FloatbarService.hidePanel, floatbar.FloatbarService);
    // TABLE
    GUI.showTable = function() {};
    GUI.closeTable = function() {};
    //esempio di metodo generico Aside Results e Form etc...
    GUI.showContentFactory = function(type) {
      var showPanelContent;
      switch (type) {
        case 'query':
          showPanelContent = GUI.showQueryResults;
          break;
        case 'form':
          showPanelContent = GUI.showForm;
          break;
      }
      return showPanelContent;
    };
    // funzione per la visualizzazione del form
    GUI.showForm = function(options) {
      // verifico che sia stato definito un formcomponent dall'editor custom del plugin
      var formComponent = options.formComponent || GUI.getComponent('form');
      var formService = formComponent.getService();
      // inizializzo il form con le opzioni
      formService.setInitForm(options);
      // agggiunto un ulteriore parametro closable
      // content, title, push, perc, split, closable)
      GUI.setContent({
        content: formComponent,
        push: false,
        closable: false
      });
      return formService;
    };
    // chiudo il form
    GUI.closeForm = function() {
      viewport.ViewportService.removeContent();
    };

    // funzione per la visuzlizzazione dei risultati
    GUI.showQueryResults = function(title, results) {
      var queryResultsComponent = GUI.getComponent('queryresults');
      var queryResultService = queryResultsComponent.getService();
      queryResultService.reset();
      if (results) {
        queryResultService.setQueryResponse(results);
      }
      GUI.showContextualContent(queryResultsComponent, "Risultati "+title);
      return queryResultService;
    };
    //temporaneo show panel
    GUI.showPanel = _.bind(sidebar.SidebarService.showPanel, sidebar.SidebarService);
    GUI.closePanel = _.bind(sidebar.SidebarService.closePanel, sidebar.SidebarService);

    /* ------------------ */

    toastr.options.positionClass = 'toast-top-center';
    toastr.options.preventDuplicates = true;
    toastr.options.timeOut = 2000;

    /* --------------------- */
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
    //fa sparire lo spinner di caricamento
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
    // MODAL
    GUI.setModal = _.bind(this._showModalOverlay, this);

    // VIEWPORT //
    GUI.setPrimaryView = function(viewName) {
      viewport.ViewportService.setPrimaryView(viewName);
    };
    // Mostra la mappa nascondendo la vista dei contenuti
    GUI.showMap = function() {
      viewport.ViewportService.showMap();
    };
    // Mostra la mappa come vista aside (nel caso sia attiva la vista contenuti). Percentuale di default 30%
    GUI.showContextualMap = function(perc,split) {
      perc = perc || 30;
      viewport.ViewportService.showContextualMap({
        perc: perc,
        split: split
      })
    };
    GUI.setContextualMapComponent = function(mapComponent) {
      viewport.ViewportService.setContextualMapComponent(mapComponent);
    };
    GUI.resetContextualMapComponent = function() {
      viewport.ViewportService.resetContextualMapComponent();
    };
    // Mostra il contenuto (100%)
    GUI.showContent = function(content, title, split) {
      var options = {
        content: content,
        title: title,
        split: split,
        perc: 100
      };
      GUI.setContent(options)
    };
    // Mostra il contenuto. Il contenuto può essere una string HTML,
    // un elemento DOM o un componente Vue. Percentuale di default 50%
    GUI.showContextualContent = function(content, title, perc, split){
      var options = {
        content: content,
        title: title,
        split: split,
        perc: perc || 50
      };
      GUI.setContent(options)
    };

    GUI.pushContent = function(content, title, perc, split) {
      var options = {
        content: content,
        title: title,
        perc: 100,
        split: split,
        push: true
      };
      GUI.setContent(options);
    };

    // Aggiunge contenuto allo stack
    GUI.pushContextualContent = function(content, title, perc, split) {
      var options = {
        content: content,
        title: title,
        perc: perc || 50,
        split: split,
        push: true
      };
      GUI.setContent(options);
    };

    GUI.setContent = function(options) {
      var content = options.content || {};
      var title = options.title || "";
      var push = options.push || false;
      var perc = options.perc || 0;
      var split = options.split || null;
      var closable = options.closable;
      viewport.ViewportService.showContent({
        content: content,
        title: title,
        push: push,
        split: split,
        perc: perc,
        closable: closable
      });
    };
    /* FINE VIEWPORT */
    /* fine metodi specifici */
    /* FINE DEFINIZIONE INTERFACCIA PUBBLICA */
  };

  base(this);
};
inherit(ApplicationTemplate,G3WObject);
// questi sono i plceholder previsti ne standard dell'applicazione

ApplicationTemplate.PLACEHOLDERS = [
  'navbar',
  'sidebar',
  'viewport',
  'floatbar'
];
// questi sono i servizi dei contenitori di componenti
ApplicationTemplate.Services = {
  navbar: null,
  sidebar: sidebar.SidebarService,
  viewport: viewport.ViewportService,
  floatbar: sidebar.FloatbarService
};

module.exports =  ApplicationTemplate;

