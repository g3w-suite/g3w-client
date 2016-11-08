var inherit = require('sdk').core.utils.inherit;
var base = require('sdk').core.utils.base;
var merge = require('sdk').core.utils.merge;
var G3WObject = require('sdk').core.G3WObject;
var MapComponent = require('sdk').gui.vue.MapComponent;
var GUI = require('sdk').gui.GUI;

var ViewportService = function() {
  // contiene lo stato della viewport
  this.state = {
    primaryView: 'map', // di default la vista primaria è la prima
    // percentuale della secondary view
    secondaryPerc: 0,
    // come viene splittatta la vista (h = orizzontale, v = verticale)
    split: 'h',
    map: {
      sizes: {
        width: 0,
        height: 0
      },
      aside: false
    },
    content:{
      sizes: {
        width: 0,
        height: 0
      },
      aside: true,
      // array contentente gli elementi nello stack del contents
      stack: [],
      closable: true,
      backonclose: false
    }
  };

  // sono i contentuti della viewport (mmappa e content)
  this._components = {
    map: null,
    content: null
  };

  this._defaultMapComponent;
  this._contextualMapComponent;
  // array content stack
  this.contentStack = [];
  // altezza e largezza minima della secondary view
  this._secondaryViewMinWidth = 300;
  this._secondaryViewMinHeight = 200;

  /* INTERFACCIA PUBBLICA */
  // funzione che va ad aggiungere i comnponenti alla viewport

  this.init = function(options) {
    // verifica se è stata settata la primary view alrimenti mette la mappa
    this.state.primaryView = options.primaryview ? options.primaryview : 'map';
    // verifica se è stato settato la modalità di splitting
    this.state.split = options.split ? options.split : 'h';
    // aggiunge i componenti ( che sono map e content
    this._addComponents(options.components);
  };

  /*
   options: {
   content: può essere una stringa di testa, un elemento jQuery o un componente Vue
   title: il title da mostrare nella finestra dei contenuti
   push (opzionale, default false): se il contenuto deve essere impilato sul precedente (con possibilità di tornare indietro nello stack dei contenuti (contentStack)
   split (opzionale, default 'h'): 'h' || 'v' splittare le finestre orizzontalmente o verticalmente. per ora testato solo orizzontalmente
   perc (opzionale, default 50): valore numerico, indica la percentuale delle finestra dei contenuti (es. 33 -> 2/3 saranno di mappa e 1/3 di contenuti)
   }
   */
  // funzione showMap per la visulizzazione della mappa
  this.showMap = function() {
    this._toggleMapComponentVisibility(this._defaultMapComponent);
    this._components['map'] = this._defaultMapComponent;
    this._showView('map');
  };

  this.showContextualMap = function(options) {
    var self = this;
    if (!this._contextualMapComponent) {
      this._contextualMapComponent = this._defaultMapComponent;
    }
    if (this._contextualMapComponent != this._defaultMapComponent) {
      this._toggleMapComponentVisibility(this._defaultMapComponent,false);
    }
    if (!this._contextualMapComponent.ismount()) {
      var contextualMapComponent = this._contextualMapComponent;
      contextualMapComponent.mount('#g3w-view-map', true)
        .then(function(){
          self._components['map'] = contextualMapComponent;
        });
    }
    else {
      self._components['map'] = this._contextualMapComponent;
      this._toggleMapComponentVisibility(this._contextualMapComponent,true);
    }
    this._showView('map',options);
  };

  this.recoverDefaultMap = function() {
    if (this._components['map'] != this._defaultMapComponent) {
      this._components['map'] = this._defaultMapComponent;
      this._toggleMapComponentVisibility(this._contextualMapComponent,false);
      this._toggleMapComponentVisibility(this._defaultMapComponent,true);
    }
  };

  this.setContextualMapComponent = function(mapComponent) {
    var self = this;
    if (mapComponent == this._defaultMapComponent) {
      return;
    }
    if (this._contextualMapComponent) {
      this._contextualMapComponent.unmount();
    }
    this._contextualMapComponent = mapComponent;
  };

  this.resetContextualMapComponent = function() {
    if (this._contextualMapComponent) {
      this._contextualMapComponent.unmount();
    }
    this._contextualMapComponent = this._defaultMapComponent;
  };

  this._toggleMapComponentVisibility = function(mapComponent,toggle) {
    mapComponent.internalComponent.$el.style.display = toggle ? 'block' : 'none';
  };

  // chiude la mappa
  this.closeMap = function() {
    this.state.secondaryPerc = (this.state.primaryView == 'map') ? 100 : 0;
    this.recoverDefaultMap();
    this._layout();
  };
  // visualizza il contentuto della content della viewport
  this.showContent = function(options) {
    // verifica se è stato settato l'opzione push
    var push = (typeof options.push === 'boolean') ? options.push : false;
    if (!push) {
      // nel caso in cui push è falso il content stack viene resettato
      this.contentStack = [];
    }
    // aggiungo al content stack i datio necessari a visualizzare il content
    this.contentStack.push(options);
    // chaimo funzione per settare il content
    this._setContents(options, push);
  };
  // funzione che toglie l'ultimo content al contentStack
  this.popContent = function() {
    if (this.contentStack.length) {
      this.recoverDefaultMap();
      this.contentStack.pop();
      var options = this.contentStack[this.contentStack.length - 1];
      this._setContents(options);
    }
  };
  // funzione che rimuove il cont dalla viewport
  this.removeContent = function() {
    if (this.state.content.backonclose) {
      this.popContent();

    } else {
      this.contentStack = [];
      this.recoverDefaultMap();
      this.closeSecondaryView();
    }
  };
  // risposte se è view primaria
  this.isPrimaryView = function(viewName) {
    return this.state.primaryView == viewName;
  };

  // metodo per definire qual'è la vista primaria
  this.setPrimaryView = function(viewTag) {
    if (this.state.primaryView != viewTag) {
      this.state.primaryView = viewTag;
    }
    this._layout();
  };

  // visualizza la primary view a seconda della percentuale passata come argomento
  this.showPrimaryView = function(perc) {
    if (perc && this.state.secondaryVisible && this.state.secondaryPerc == 100) {
      this.state.secondaryPerc = 100 - perc;
      this._layout();
    }
  };
  // metodo per la visualizzazione della vista secondaria
  this.showSecondaryView = function(split, perc) {
    this.state.secondaryVisible = true;
    this.state.split = split ? split : this.state.split;
    this.state.secondaryPerc = perc ? perc : this.state.perc;
    this._layout();
  };

  this.closeSecondaryView = function(componentId) {
    var self = this;
    var secondaryViewComponent = this._components[this._otherView(this.state.primaryView)];

    if (secondaryViewComponent.clearContents) {
      secondaryViewComponent.clearContents()
        .then(function(){
          self.state.secondaryVisible = false;
          self._layout();
        });
    }
    else {
      this.state.secondaryVisible = false;
      // questo è il metodo che esegue il layout delle viste, e dà ad ogni componente l'opportunità di ricalcolare il proprio layout
      this._layout();
    }
  };
  // aggiunge i componenti alla viewport
  this._addComponents = function(components) {
    var self = this;
    // i components è un oggetto contente chiave nome componente e valure istanza componente
    _.forEach(components, function(component, viewName) {
      // verifica che i componenti siano map o content
      if (['map', 'content'].indexOf(viewName) > -1) {
        // monto il componente sull'id specifico del componenti della mappa
        // map e content
        component.mount('#g3w-view-'+viewName, true).
        then(function() {
          self._components[viewName] = component;
          if (viewName == 'map') {
            // setto il defaul mappa componente
            self._defaultMapComponent = component;
          }
        });
      }
    })
  };

  // setto il content della viewport
  this._setContents = function(options, push) {
    var self = this;
    // viene chiamato il metodo setContents del componente deputato a gestire/mostrare contenuti generici (di default usiamo template/js/contentsviewer.js)
    // il contentviewer usa il barstack usato anche dalle sidebar, ma in realtà (vedi metodo setContents) pulisce sempre lo stack, perché in questo caso lo stack viene gestito direttamente da viewport.js
    this._components.content.setContent(options.content)
      .then(function() {
        self.state.content.preferredPerc = options.perc || self.getDefaultViewPerc('content');
        self.state.content.title = options.title;
        self.state.content.closable =  _.isNil(options.closable) ? true : options.closable;
        self.state.content.backonclose = _.isNil(options.backonclose) ? true : options.backonclose;
        self.state.content.stack = _.map(self.contentStack,function(contentOptions) {
          return contentOptions.title;
        });
        self._showView('content', options)
      })
  };

  // metodo che si occupa delle gestione di tutta la logica di visualizzazione delle due viste (mappa e contenuti)
  // viewName può essere: map o content
  // le opzione specificano percentuali , splitting tittolo etc ..
  this._showView = function(viewName, options) {
    options = options || {};
    var perc = options.perc || this.getDefaultViewPerc(viewName);
    var split = options.split || 'h';
    var aside;
    if (this.isPrimaryView(viewName)) {
      aside = (typeof(options.aside) == 'undefined') ? false : options.aside;
    }
    else {
      aside = true;
    }
    this.state[viewName].aside = aside;
    var secondaryPerc = this.isPrimaryView(viewName) ? 100 - perc : perc;
    if (secondaryPerc > 0) {
      this.showSecondaryView(split,secondaryPerc);
    }
    else {
      this.closeSecondaryView();
    }
  };
  this.getDefaultViewPerc = function(viewName) {
    return this.isPrimaryView(viewName) ? 100 : 50;
  };


  // ritorna la vista opposta rispoetto a quella passata
  this._otherView = function(viewName) {
    return (viewName == 'map') ? 'content' : 'map';
  };

  // meccanismo per il ricalcolo delle dimensioni della viewport e dei suoi componenti figli
  this._setPrimaryView = function(viewTag) {
    if (this.state.primaryView != viewTag) {
      this.state.primaryView = viewTag;
    }
  };
  // funzione che viene chiamat la prima volta che si instanzia la viewport
  this._firstLayout = function() {
    var self = this;
    var drawing = false;
    var resizeFired = false;

    function triggerResize() {
      resizeFired = true;
      drawResize();
    }

    function drawResize() {
      if (resizeFired === true) {
        resizeFired = false;
        drawing = true;
        self._layout();
        requestAnimationFrame(drawResize);
      } else {
        drawing = false;
      }
    }
    // una volta che la GUI è pronta
    GUI.on('ready',function(){
      // primo layout
      var primaryView = self.state.primaryView;
      var secondaryView = self._otherView(primaryView);
      var secondaryEl = $(".g3w-viewport ."+secondaryView);

      var seondaryViewMinWidth = secondaryEl.css('min-width');
      if ((seondaryViewMinWidth != "") && !_.isNaN(parseFloat(seondaryViewMinWidth))) {
        self._secondaryViewMinWidth =  parseFloat(seondaryViewMinWidth);
      }
      var seondaryViewMinHeight = secondaryEl.css('min-height');
      if ((seondaryViewMinHeight != "") && !_.isNaN(parseFloat(seondaryViewMinHeight))) {
        self._secondaryViewMinHeight =  parseFloat(seondaryViewMinHeight);
      }

      self._layout();

      // resize scatenato da GUI
      GUI.on('guiresized',function(){
        triggerResize();
      });

      // resize della window
      $(window).resize(function() {
        // set resizedFired to true and execute drawResize if it's not already running
        if (drawing === false) {
          triggerResize();
        }
      });

      // resize sul ridimensionamento della sidebar
      $('.main-sidebar').on('webkitTransitionEnd transitionend msTransitionEnd oTransitionEnd', function () {
        $(this).trigger('trans-end');
        triggerResize();
      });
    });
  };
  // funzione che setta i size delle view (primaria e secondari)
  this._setViewSizes = function() {
    // view primaria e secondaria
    var primaryView = this.state.primaryView;
    var secondaryView = this._otherView(primaryView);
    // alterzza e larghezza della viewport
    var viewportWidth = this._viewportWidth();
    var viewportHeight = this._viewportHeight();
    // asegna alla primary view l'altezza e la larghezza della viewport
    var primaryWidth = viewportWidth;
    var primaryHeight = viewportHeight;
    //
    var scale = this.state.secondaryPerc / 100;
    // verifica il tipo di plistting
    // caso orizzontale
    if (this.state.split == 'h') {
      secondaryWidth = this.state.secondaryVisible ? Math.max((viewportWidth * scale),this._secondaryViewMinWidth) : 0;
      secondaryHeight = viewportHeight;
      primaryWidth = viewportWidth - secondaryWidth;
      primaryHeight = viewportHeight;
    }
    else {
      secondaryWidth = viewportWidth;
      secondaryHeight = this.state.secondaryVisible ? Math.max((viewportHeight * scale),this._secondaryViewMinHeight) : 0;
      primaryWidth = viewportWidth;
      primaryHeight = viewportHeight - secondaryHeight;
    }
    // riassegno le giuste proporzione in sie height e width alla primary e secondary view
    this.state[primaryView].sizes.width = primaryWidth;
    this.state[primaryView].sizes.height = primaryHeight;

    this.state[secondaryView].sizes.width = secondaryWidth;
    this.state[secondaryView].sizes.height = secondaryHeight;
  };

  this._viewportHeight = function() {
    var topHeight = $(".navbar").innerHeight();
    return $(window).innerHeight() - topHeight;
  };
  // funzione che restituisce la larghezza della view
  this._viewportWidth = function() {
    var offset = $(".main-sidebar").offset().left;
    var width = $(".main-sidebar").innerWidth();
    var sideBarSpace = width + offset;
    return $(window).innerWidth() - sideBarSpace;
  };
  // funzione che stabilisce il layout e la visulizzazione verticale (v) o orizzontale (h)
  this._layout = function() {
    // prende il tipo di split
    var splitClassToAdd = (this.state.split == 'h') ? 'split-h' : 'split-v';
    var splitClassToRemove =  (this.state.split == 'h') ? 'split-v' : 'split-c';
    $(".g3w-viewport .g3w-view").addClass(splitClassToAdd);
    $(".g3w-viewport .g3w-view").removeClass(splitClassToRemove);
    // setta il size delle vista
    this._setViewSizes();
    // carica il layout dei componenti
    this._layoutComponents();
  };
  // funzione che va a
  this._layoutComponents = function() {
    var self = this;
    _.forEach(this._components, function(component, name){
      // viene chiamato il metodo per il ricacolo delle dimensioni nei componenti figli
      var width = self.state[name].sizes.width;
      var height = self.state[name].sizes.height;
      // ogni componente (mappa e contenuto) qui ha l'opportunità di ricalcolare il proprio il layout. Usato per esempio dalla mappa per reagire al resize della viewport
      component.layout(width,height);
    })
  };

  this._firstLayout();
  base(this);
};
inherit(ViewportService, G3WObject);

var viewportService = new ViewportService;


// COMPONENTE VUE VIEWPORT
var ViewportComponent = Vue.extend({
  template: require('../html/viewport.html'),
  data: function() {
    return {
      state: viewportService.state // lo stato del compoente è quello del servizio
    }
  },
  computed: {
    contentTitle: function() {
      // cambia il titolo prendendo l'ultimo elemento aggiunto alla stack
      return this.state.content.stack[this.state.content.stack.length - 1];
    },
    previousTitle: function() {
      // prende il titolo del precendete elemento
      if (this.state.content.stack.length > 1) {
        return this.state.content.stack[this.state.content.stack.length - 2]
      }
      return null;
    },
    contentSmallerThenPreferred: function() {
      return this.state.secondaryPerc < this.state.content.preferredPerc;
    }
  },
  methods: {
    closeContent: function() {
      viewportService.removeContent();
    },
    closeMap: function() {
      viewportService.closeMap();
    },
    gotoPreviousContent: function() {
      viewportService.popContent();
    }
  }
});

module.exports = {
  ViewportService: viewportService,
  ViewportComponent: ViewportComponent
};
