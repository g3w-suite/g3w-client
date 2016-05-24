var inherit = require('g3w/core/utils').inherit;
var base = require('g3w/core/utils').base;
var G3WObject = require('g3w/core/g3wobject');
var ProjectsRegistry = require('g3w/core/projectsregistry');
var PluginsService = require('g3w/core/pluginsservice');
var ToolsService = require('g3w/core/toolsservice');
var Nominatim = require('g3w/core/geocodingservice').Nominatim;
var GeocodingListPanelComponent = require('g3w/gui/geocoding/listpanel');
var ListPanel = require('g3w/gui/listpanel').ListPanel;

var GUI = require('g3w/gui/gui');

var SidebarService = require('./layout/sidebar').SidebarService;
var FloatbarService = require('./layout/floatbar').FloatbarService;

var AppService = function(){
  var self = this;
  this.initialized = false;
  this._modalOverlay = null;
  this.config = {};
  
  // chiama il costruttore di G3WObject (che in questo momento non fa niente)
  base(this);
};
inherit(AppService,G3WObject);

var proto = AppService.prototype;

proto.init = function(config){
  this.config = config;
  this._bootstrap();
  
  Nominatim.on("results",function(result,query){
    var listPanel = new ListPanel({
      name: "Risultati ricerca '"+query+"'",
      id: 'nominatim_results',
      list: result,
      listPanelComponent: GeocodingListPanelComponent
    });
    GUI.showListing(listPanel);
  })
};

proto._bootstrap = function(){
  var self = this;
  if (!this.initialized){
    $(function(){
      $("#loading").addClass("loading");;
    });
    // definisco (implemento) i metodi dell'API globale della GUI
    GUI.getResourcesUrl = function(){ return self.config.resourcesurl };
    // mostra un pannello nella floatbar
    GUI.showForm = _.bind(FloatbarService.showPanel,FloatbarService);
    GUI.closeForm = _.bind(FloatbarService.closePanel,FloatbarService);
    GUI.showListing = _.bind(FloatbarService.showPanel,FloatbarService);
    GUI.closeListing = _.bind(FloatbarService.closePanel,FloatbarService);
    // mostra un pannello nella sidebar
    GUI.showPanel = _.bind(SidebarService.showPanel,SidebarService);

    GUI.setModal = _.bind(this._showModalOverlay,this);
    
    //inizializza la configurazione dei servizi. Ognungo cercherà dal config quello di cui avrà bisogno
    //una volta finita la configurazione emetto l'evento ready. A questo punto potrò avviare l'istanza Vue globale
    $.when(
      ProjectsRegistry.init(this.config),
      PluginsService.init(this.config.plugins),
      ToolsService.init(this.config.tools)
    ).then(function(){
      self.emit('ready');
      this.initialized = true;
    });
  };
};

proto._showModalOverlay = function(bool){
  if (!this._modalOverlay){
    this._modalOverlay = $('<div id="g3w-modal-overlay" style="background-color: #000000; opacity: 0.7;z-index:4000;position:fixed;top:0px;left:0px"></div>');
    $("body").append(this._modalOverlay);
    this._modalOverlay.width($(window).innerWidth());
    this._modalOverlay.height($(window).innerHeight());
  }
  if (_.isUndefined(bool) || bool === true){
    this._modalOverlay.show();
  }
  else {
    this._modalOverlay.hide();
  }
};

module.exports = new AppService;
