var inherit = require('sdk').core.utils.inherit;
var base = require('sdk').core.utils.base;
var G3WObject = require('sdk').core.G3WObject;
var GUI = require('sdk').gui.GUI;

// calsse servizio della viewport
var ViewportService = function() {
  // contiene lo stato della viewport
  this.state = {
    primaryView: 'map', // di default la vista primaria è la prima
    // percentuale della secondary view
    secondaryPerc: 0,
    // come viene splittatta la vista (h = orizzontale, v = verticale)
    split: 'h',
    //mappa
    map: {
      sizes: {
        width: 0,
        height: 0
      },
      aside: false
    },
    //content
    content:{
      sizes: {
        width: 0,
        height: 0
      },
      aside: true,
      stack: [], // array contentente gli elementi nello stack del contents
      closable: true, // specifica se chiudibile o meno (presenza della x)
      backonclose: false, // se al click della x deve essere chiso il contenuto tutto o toglierer l'ultomo contenuto dalla stack
      contentsdata:[] // array contenete i dati del content
    }
  };
  // sono i contentuti della viewport (mappa e content)
  this._components = {
    map: null,
    content: null
  };
  // contenuti di default
  this._defaultMapComponent;
  this._contextualMapComponent;

  // altezza e largezza minima della secondary view
  // imposte per evitare che la secondaryView (principalmente il content) possa diventare
  // molto piccola (esempio impostando un perc = 1) e quindi rendere illeggibile
  // il contenuto
  this._secondaryViewMinWidth = 300;
  this._secondaryViewMinHeight = 200;
  // attributo che serve per
  this._immediateComponentsLayout = true;
  /* INTERFACCIA PUBBLICA */
  // funzione che va ad aggiungere i comnponenti alla viewport
  // funzione di inizialilizzazione
  this.init = function(options) {
    var options = options || {};
    // verifica se è stata settata/specificata la primary view altrimenti mette la mappa di default
    this.state.primaryView = options.primaryview ? options.primaryview : 'map';
    // verifica se è stato settato la modalità di splitting altrimenti mette quello orizzontale
    this.state.split = options.split ? options.split : 'h';
    // aggiunge i componenti ( che sono map e content)
    this._addComponents(options.components);
  };

  // aggiunge i componenti alla viewport
  this._addComponents = function(components) {
    var self = this;
    // components è un oggetto contente chiave nome componente e valure istanza componente
    // nel caso attuale (vedi index.js)
    /*
     {
      map: new MapComponent({
        id: 'map'
      }),
      content: new ContentsComponent({
        id: 'contents'
      })
     }
     */
    _.forEach(components, function(component, viewName) {
      // verifica che i componenti siano map o content
      if (['map', 'content'].indexOf(viewName) > -1) {
        // monto (chiamo il metodo mount che tuttti i componeti hanno) componente sull'id specifico del componenti della mappa
        // map e content
        // monto con append a true
        component.mount('#g3w-view-'+viewName, true)
          .then(function() {
            // una volta che è stato montato aggiungo
            // all'array components
            self._components[viewName] = component;
            // verifico se il nome della view è la mappa
            if (viewName == 'map') {
              // setto il il componete come componente mappa di default
              self._defaultMapComponent = component;
            }
          });
      }
    })
  };


  // funzione showMap per la visulizzazione della mappa
  this.showMap = function() {
    this._toggleMapComponentVisibility(this._defaultMapComponent,true);
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

  // funzione che recupera il componente mappa di default
  this.recoverDefaultMap = function() {
    // se il componente mappa è diversa dal componente mappa di default
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
  /*
   options: {
     content: può essere una stringa di testo, un elemento jQuery o un componente Vue
     title: il title da mostrare nella finestra dei contenuti
     push (opzionale, default false): se il contenuto deve essere impilato sul precedente (con possibilità di tornare indietro nello stack dei contenuti (contentStack)
     split (opzionale, default 'h'): 'h' || 'v' splittare le finestre orizzontalmente o verticalmente. per ora testato solo orizzontalmente
     perc (opzionale, default 50): valore numerico, indica la percentuale delle finestra dei contenuti (es. 33 -> 2/3 saranno di mappa e 1/3 di contenuti)
   }
   */
  // funzione che è chiamata da GUI.setContent per visualizzare conentuto all'interno del content component
  this.showContent = function(options) {
    var self = this;
    // verifica se è stato settato l'opzione push
    options.push = options.push || false;
    // vado a settare tutti i parametri per il content come la parcentuale, titolo, etc ..
    this._prepareContentView(options);
    // setto immediateComponentsLayout a false
    this._immediateComponentsLayout = false;
    this._showView('content', options, true);
    // chiamo la funzione setContent del componente componentsViewer
    this._components.content.setContent(options)
      .then(function() {
        // rivado a settare t
        self._layoutComponents();
        self._immediateComponentsLayout = true;
      })
  };

  // funzione che toglie l'ultimo content al contentStack
  this.popContent = function() {
    var self = this;
    // verifica che ci sia il conentuto nel compontentStack
    if (this.state.content.contentsdata.length) {
      this.recoverDefaultMap();
      // recupero il precedente content dallo stack
      var data = this._components.content.getPreviousContentData();
      self._prepareContentView(data.options);
      this._immediateComponentsLayout = false;
      this._showView('content');
      this._components.content.popContent()
        .then(function(){
          self._layoutComponents();
          self._immediateComponentsLayout = true;
        })
    }
  };

  // funzione che rimuove il cont dalla viewport
  this.removeContent = function() {
    // verifico che l'attributo backonclose sia true o false
    // per fare in modo che lo stack del contentStack si completamente rimosso
    // o tolto solamente il componente
    if (this.state.content.backonclose && this.state.content.contentsdata.length > 1) {
      this.popContent();
    } else {
      this._components.content.removeContent();
      //fa il recover della mappa di default
      this.recoverDefaultMap();
      // chido la View secondaria
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
  // nella maggior parte dei casi è il content
  this.showSecondaryView = function(split, perc) {
    // setto la visibilità dello stato della seconda view
    this.state.secondaryVisible = true;
    this.state.split = split ? split : this.state.split;
    this.state.secondaryPerc = perc ? perc : this.state.perc;
    // richiamo la funzione layout
    this._layout();
  };

  // chiudo la view secondaria
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
      // questo è il metodo che esegue il layout delle viste,
      // e dà ad ogni componente l'opportunità di ricalcolare il proprio layout
      this._layout();
    }
  };

  //ritorna il valore di default della percentuale della view a sconda del tipo
  // di content
  this.getDefaultViewPerc = function(viewName) {
    return this.isPrimaryView(viewName) ? 100 : 50;
  };

  // ritorna la vista opposta rispoetto a quella passata
  this._otherView = function(viewName) {
    return (viewName == 'map') ? 'content' : 'map';
  };

  this._isSecondary = function(view) {
    return this.state.primaryView != view;
  };

  // meccanismo per il ricalcolo delle dimensioni della viewport e dei suoi componenti figli
  this._setPrimaryView = function(viewTag) {
    if (this.state.primaryView != viewTag) {
      this.state.primaryView = viewTag;
    }
  };

  // setto gli attributi del content della viewport
  this._prepareContentView = function(options) {
    this.state.content.preferredPerc = options.perc || this.getDefaultViewPerc('content');
    this.state.content.title = options.title;
    this.state.content.closable =  _.isNil(options.closable) ? true : options.closable;
    this.state.content.backonclose = _.isNil(options.backonclose) ? true : options.backonclose;
    this.state.content.contentsdata = this._components.content.contentsdata;
  };

  // metodo che si occupa delle gestione di tutta la logica di visualizzazione delle due viste (mappa e contenuti)
  // viewName può essere: map o content
  // le opzione specificano percentuali , splitting tittolo etc ..
  this._showView = function(viewName, options) {
    options = options || {};
    // prende il parametro percentuale
    var perc = options.perc || this.getDefaultViewPerc(viewName);
    // prende la tipologia di split della viewport
    var split = options.split || 'h';
    var aside;
    // verifica se la view in question è la primaria o meno
    if (this.isPrimaryView(viewName)) {
      aside = (typeof(options.aside) == 'undefined') ? false : options.aside;
    }
    else {
      aside = true;
    }
    // setto il valore di aside della view
    this.state[viewName].aside = aside;
    // calcolo la percentuale della view secondaria
    var secondaryPerc = this.isPrimaryView(viewName) ? 100 - perc : perc;
    if (secondaryPerc > 0) {
      // vado a visualizzare la secondaru view
      this.showSecondaryView(split, secondaryPerc);
    } else {
      // vado a chidere la view secondaria
      this.closeSecondaryView();
    }
  };

  // funzione che restituisce le misure in alterzza e larghezza per cui
  // il contentuo deve essere spostato per evitare che venga messo sotto
  //sidebar-aside-toggle nel caso di un content al 100% a tutta viewport
  this._getReducedSizes = function(){
    var contentEl = $('.content');
    var reducedWidth = 0;
    var reducedHeight = 0;
    if (contentEl && this.state.secondaryVisible && this.state.secondaryPerc == 100) {
      var sideBarToggleEl = $('.sidebar-aside-toggle');
      if (sideBarToggleEl && sideBarToggleEl.is(':visible')) {
        var toggleWidth = sideBarToggleEl.outerWidth();
        contentEl.css('padding-left',toggleWidth + 5);
        reducedWidth = (toggleWidth - 5);
      }
    }
    else {
      contentEl.css('padding-left',15);
    }
    return {
      reducedWidth: reducedWidth,
      reducedHeight: reducedHeight
    }
  };

  // funzione principale che si occupa dell'intero layout della vieport
  this._layout = function() {
    var self = this;
    // prende il tipo di split
    var splitClassToAdd = (this.state.split == 'h') ? 'split-h' : 'split-v';
    var splitClassToRemove =  (this.state.split == 'h') ? 'split-v' : 'split-c';
    // vengono aggiunte e rimosse le classi
    $(".g3w-viewport .g3w-view").addClass(splitClassToAdd);
    $(".g3w-viewport .g3w-view").removeClass(splitClassToRemove);
    var reducesdSizes = this._getReducedSizes();
    // setta il size delle vista
    this._setViewSizes(reducesdSizes.reducedWidth,reducesdSizes.reducedHeight);
    // cloaseMap button
    var closeMapBtn = $('#closemap-btn');
    if (!closeMapBtn.length) {
      var closeMapBtn = $('<div id="closemap-btn" @click="closeMap" style="\
        position: absolute;\
        right: 10px;\
        top: 7px;\
        line-height: 1;\
        padding: 7px 2px;\
        font-size: 1.5em;\
        background-color: #3c8dbc;\
        color: white;\
        z-index:1000;\
        height: 39px;\
        width: 39px">\
          <button class="glyphicon glyphicon-remove pull-right close-panel-button" style="background-color: transparent;border: 0px;"></button>\
        </div>');
      closeMapBtn.on('click',function(){
        self.closeMap();
      });
      var mapView = $(".g3w-viewport .map");
      mapView.append(closeMapBtn);
    }

    if (this.state.secondaryVisible) {
      if (this._isSecondary('content') && (this.state.secondaryPerc < this.state.content.preferredPerc)) {
        closeMapBtn.show()
      }
      else {
        closeMapBtn.hide();
      }
    }
    else {
      closeMapBtn.hide();
    }

    if (this._immediateComponentsLayout) {
      this._layoutComponents();
    }
  };

  // funzione che setta i size delle view (primaria e secondari)
  this._setViewSizes = function() {
    // view primaria e secondaria
    var primaryView = this.state.primaryView;
    // recupera la seconda View che è non è la primary (verosimilmente 'content')
    var secondaryView = this._otherView(primaryView);
    // altezza e larghezza della viewport
    var viewportWidth = this._viewportWidth();
    var viewportHeight = this._viewportHeight();
    // asegna alla primary view l'altezza e la larghezza della viewport
    var primaryWidth = viewportWidth;
    var primaryHeight = viewportHeight;
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
    // riassegno le giuste proporzione in sia height e width alla primary e secondary view
    // primary ViewSizes
    this.state[primaryView].sizes.width = primaryWidth;
    this.state[primaryView].sizes.height = primaryHeight;
    // secondaryViewSizes
    this.state[secondaryView].sizes.width = secondaryWidth;
    this.state[secondaryView].sizes.height = secondaryHeight;
  };

  // funzione che restituisce l'altezza che deve avere la viewPort
  this._viewportHeight = function() {
    var topHeight = $(".navbar").innerHeight();
    return $(window).innerHeight() - topHeight;
  };

  // funzione che restituisce la larghezza della view
  this._viewportWidth = function() {
    // prendo la posizione della posizione a sinistra
    // della sidebar
    var offset = $(".main-sidebar").offset().left;
    var width = $(".main-sidebar").innerWidth();
    var sideBarSpace = width + offset;
    // resituisco la larghezza riservata alla viewport
    return $(window).innerWidth() - sideBarSpace;
  };

  // funzione che va a caricare i componenti (della viewport)
  // solo dopo che le size delle view sono state corrette
  this._layoutComponents = function() {
    var reducesdSizes = this._getReducedSizes();
    reducedWidth = reducesdSizes.reducedWidth || 0;
    reducedHeight = reducesdSizes.reducedHeight || 0;
    var self = this;
    _.forEach(this._components, function(component, name) {
      // viene chiamato il metodo per il ricacolo delle dimensioni nei componenti figli
      var width = self.state[name].sizes.width - reducedWidth ;
      var height = self.state[name].sizes.height - reducedHeight;
      // ogni componente (mappa e contenuto) qui
      // ha l'opportunità di ricalcolare il proprio il layout.
      // Usato per esempio dalla mappa per reagire al resize della viewport
      component.layout(width, height);
    })
  };

  // funzione che viene chiamata la prima volta che
  // si instanzia la viewport
  this._firstLayout = function() {
    var self = this;
    var drawing = false;
    var resizeFired = false;

    // funzione che fa il trigger del resize
    function triggerResize() {
      resizeFired = true;
      drawResize();
    }

    function drawResize() {
      if (resizeFired === true) {
        resizeFired = false;
        drawing = true;
        // chiama la funzione che si occupa ti settare
        // il layout della viewport
        self._layout(true);
        //funzione javascript nativa del browser (html5) che serve
        // per il Controllo temporizzazione per animazioni basate su script
        requestAnimationFrame(drawResize);
      } else {
        drawing = false;
      }
    }
    // registra la funzione che deve essere lanciata una volta che
    // la GUI e pronta (si ha quando è stato chiamato il metodo _buildTemplate di template.js)
    // che non fa altro che aggiungere alle varie parti dell'applicazione
    GUI.on('ready',function(){
      // prendo al primary view (verosimilmente 'map')
      var primaryView = self.state.primaryView;
      // secondary view 'content' di solito
      var secondaryView = self._otherView(primaryView);
      // seleziono l'elemento secondario con JQuery
      var secondaryEl = $(".g3w-viewport ."+secondaryView);
      // prendo (se esiste il valore css della seconday view min-width)
      var secondaryViewMinWidth = secondaryEl.css('min-width');
      if ((secondaryViewMinWidth != "") && !_.isNaN(parseFloat(secondaryViewMinWidth))) {
        self._secondaryViewMinWidth =  parseFloat(secondaryViewMinWidth);
      }
      var secondaryViewMinHeight = secondaryEl.css('min-height');
      if ((secondaryViewMinHeight != "") && !_.isNaN(parseFloat(secondaryViewMinHeight))) {
        self._secondaryViewMinHeight =  parseFloat(secondaryViewMinHeight);
      }
      self._layout(true);
      // resize scatenato da GUI
      GUI.on('guiresized',function() {
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
  this._firstLayout();
  base(this);
};
// eredita da G3WOBJECT
inherit(ViewportService, G3WObject);

//singleton
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
    // proprietà derivata (booleana) che è legata al contentsdata dell'oggetto content
    showtitle: function() {
      var showtitle = true;
      // prende l'array di componenti dello stack del content
      var contentsData = this.state.content.contentsdata;
      if (contentsData.length) {
        var options = contentsData[contentsData.length - 1].options;
        if (_.isBoolean(options.showtitle)) showtitle = options.showtitle;
      }
      return showtitle;
    },
    contentTitle: function() {
      // cambia il titolo prendendo l'ultimo elemento aggiunto alla stack
      var contentsData = this.state.content.contentsdata;
      if (contentsData.length) {
        return contentsData[contentsData.length - 1].options.title;
      }
    },
    previousTitle: function() {
      // prende il titolo del precendete elemento
      var contentsData = this.state.content.contentsdata;
      if (contentsData.length > 1) {
        return contentsData[contentsData.length - 2].options.title;
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
