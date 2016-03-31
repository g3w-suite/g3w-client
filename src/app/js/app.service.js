var inherit = require('g3w/core/utils').inherit;
var base = require('g3w/core/utils').base;
var G3WObject = require('g3w/core/g3wobject');
var ProjectsRegistry = require('g3w/core/projectsregistry');
var PluginsRegistry = require('g3w/core/pluginsregistry');
var Nominatim = require('g3w/core/geocodingservice').Nominatim;
var GeocodeListing = require('g3w/gui/geocoding/geocode.listing');

var GUI = require('g3w/gui/gui');

var FloatBar = require('layout/floatbar/floatbar');

var AppService = function(){
  var self = this;
  this.initialized = false;
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
    FloatBar.insert(gl);
  })
};

proto.showForm = function(){
  FloatBar.open();
};

proto._bootstrap = function(){
  var self = this;
  if (!this.initialized){
    
    // definisco (implemento) i metodi dell'API globale della GUI
    GUI.showForm = this.showForm;
    
    //inizializza la configurazione dei servizi. Ognungo cercherà dal config quello di cui avrà bisogno
    //una volta finita la configurazione emetto l'evento ready. A questo punto potrò avviare l'istanza Vue globale
    $.when(
      ProjectsRegistry.init(this.config),
      PluginsRegistry.init(this.config)
    ).then(function(){
      self.emit('ready');
      this.initialized = true;
    });
  };
};

module.exports = new AppService;
