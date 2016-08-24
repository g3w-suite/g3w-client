var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var ApiService = require('core/apiservice');
var RouterService = require('core/router');
var ProjectsRegistry = require('core/project/projectsregistry');
var PluginsRegistry = require('core/plugin/pluginsregistry');

var ApplicationService = function(){
  this.secret = "### G3W Client Application Service ###";
  var self = this;
  this.initialized = false;
  this._modalOverlay = null;
  this.config = {};

  // chiama il costruttore di G3WObject (che in questo momento non fa niente)
  base(this);
  
  this.init = function(config){
    this._config = config;
    this._bootstrap();
  };
  
  this.getConfig = function() {
    return this._config;
  };
  
  this.getRouterService = function() {
    return RouterService;
  }
  
  this._bootstrap = function(){
    var self = this;
    if (!this.initialized){
      //inizializza la configurazione dei servizi. Ognungo cercherà dal config quello di cui avrà bisogno
      //una volta finita la configurazione emetto l'evento ready. A questo punto potrò avviare l'istanza Vue globale
      $.when(
        ApiService.init(this._config),
        ProjectsRegistry.init(this._config)
      ).then(function(){
        PluginsRegistry.init({
          plusingBaseUrl: self._config.urls.staticurl,
          pluginsConfigs: self._config.plugins
        });
        self.emit('ready');
        this.initialized = true;
      });
    };
  };
};
inherit(ApplicationService,G3WObject);

module.exports = new ApplicationService;
