var inherit = require('./utils/utils').inherit;
var base = require('./utils/utils').base;
var G3WObject = require('./g3wobject');
var ApiService = require('./apiservice');
var ProjectsRegistry = require('./project/projectsregistry');
var PluginsRegistry = require('./project/pluginsregistry');

var ApplicationService = function(){
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
      PluginsRegistry.init(this.config.plugins)
    ).then(function(){
      self.emit('ready');
      this.initialized = true;
    });
  };
};

module.exports = new ApplicationService;
