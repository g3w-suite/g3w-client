var inherit = require('g3w/core/utils').inherit;
var base = require('g3w/core/utils').base;
var G3WObject = require('g3w/core/g3wobject');
var ProjectsRegistry = require('g3w/core/projectsregistry');
var PluginsService = require('g3w/core/pluginsservice');
var ToolsService = require('g3w/core/toolsservice');
// per ora la configurazione dei tools è statica dentro /src/app
var toolsconfig = require('tools.config');
var Nominatim = require('g3w/core/geocodingservice').Nominatim;
var GeocodeListing = require('g3w/gui/geocoding/geocode.listing');

var GUI = require('g3w/gui/gui');

var SideBar = require('layout/sidebar/sidebar');
var FloatBar = require('layout/floatbar/floatbar');

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
  
  Nominatim.on("results",function(results){
    var gl = new GeocodeListing();
    gl.results = results;
    FloatBar.insertVM(gl);
  })
};

proto._bootstrap = function(){
  var self = this;
  if (!this.initialized){
    
    // definisco (implemento) i metodi dell'API globale della GUI
    GUI.getResourcesUrl = function(){ return self.config.resourcesurl };
    // mostra un pannello nella floatbar
    GUI.showForm = _.bind(FloatBar.showPanel,FloatBar);
    GUI.closeForm = _.bind(FloatBar.closePanel,FloatBar);
    // mostra un pannello nella sidebar
    GUI.showPanel = _.bind(SideBar.showPanel,SideBar);
    
    GUI.setModal = _.bind(this._showModalOverlay,this);
    
    //inizializza la configurazione dei servizi. Ognungo cercherà dal config quello di cui avrà bisogno
    //una volta finita la configurazione emetto l'evento ready. A questo punto potrò avviare l'istanza Vue globale
    $.when(
      ProjectsRegistry.init(this.config),
      PluginsService.init(this.config),
      ToolsService.init(toolsconfig)
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
