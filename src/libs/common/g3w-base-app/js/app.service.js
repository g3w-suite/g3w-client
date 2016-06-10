var inherit = require('g3w/core/utils').inherit;
var base = require('g3w/core/utils').base;
var G3WObject = require('g3w/core/g3wobject');
var ApiService = require('g3w/core/apiservice');
var ProjectsRegistry = require('g3w/core/projectsregistry');
var PluginsRegistry = require('g3w/core/pluginsregistry');
var MapService = require('g3w/core/mapservice');
var ToolsService = require('g3w/core/toolsservice');

var MapView = require('g3w/gui/map/map');

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
};

proto._bootstrap = function(){
  var self = this;
  if (!this.initialized){
    
    //inizializza la configurazione dei servizi. Ognungo cercherà dal config quello di cui avrà bisogno
    //una volta finita la configurazione emetto l'evento ready. A questo punto potrò avviare l'istanza Vue globale
    $.when(
      ApiService.init(this.config),
      ProjectsRegistry.init(this.config),
      PluginsRegistry.init(this.config.plugins),
      MapService.init(this.config.map),
      ToolsService.init(this.config.tools)
    ).then(function(){
      self.emit('ready');
      this.initialized = true;
    });
  };
};

proto.showModalOverlay = function(bool){
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

proto.getDefaultView = function(){
  var view;
  if (this.config.views && this.config.views.default) {
    view = this.config.views.default;
  }
  else {
    view = require('g3w/gui/map/map');
  }
  return view.getViewComponent();
};

module.exports = new AppService;
