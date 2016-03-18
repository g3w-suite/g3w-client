var inherit = require('g3w/core/utils').inherit;
//oggetto che restituisce layers e layerstree
var LayersStore = require('./layersstore');

/* service
Funzione costruttore contentente tre proprieta':
    setup: metodo di inizializzazione
    getLayersStore: ritorna l'oggetto LayersStore
    getLayersTree: ritorna l'array layersTree dall'oggetto LayersStore
*/

// Public interface
function service(){
  var self = this;
  //config generale
  this.setup = function(config){
    _service.setup(config)
    .then(function(){
      self.emit("loaded");
    });
  };
  this.getLayersStore = function(){
    return _service.layersStore;
  };
  this.getLayersTree = function(){
    var layersTree = _service.layersStore.getLayersTree();
    if (_.isNull(layersTree)){
      layersTree = [];
    }
    return layersTree;
  };
}

// Make the public service en Event Emitter
inherit(service,EventEmitter);

// Private
var _service = {
  initialized: false,
  config: null,
  currentProject: null,
  layersStore: null,
  
  setup: function(config){
    if (!this.initialized){
      this.config = config;
      return this.loadProject(config.group.initproject);
    }
  },
  
  loadProject: function(project){
    if (this.projectAvailable(project)) {
      var self = this;
      return this.getProjectConfig(project)
      .then(function(projectConfig){
        self.currentProject = projectConfig;
        self.layersStore = new LayersStore({
          layers: projectConfig.layers,
          layersTree: projectConfig.layerstree
        });
        self.initialized = true;
      });
    }
  },
  
  projectAvailable: function(project){
    var exists = false;
    _.forEach(this.config.group.projects,function(val){
      if (val.type == project.type && val.id == project.id){
        exists = true;
      }
    });
    return exists;
  },
  
  getProjectConfig: function(project){
    var self = this;
    var deferred = Q.defer();
    if (this.config.client.local){
      setTimeout(function(){
        var projectConfig = require('./test.project_config');
        deferred.resolve(projectConfig);
      },100);
    }
    else {
      var url = this.config.server.urls.config+'/'+this.config.group.id+'/'+project.type+'/'+project.id;
      $.get(url).done(function(projectConfig){
        deferred.resolve(projectConfig);
      })
    }
    return deferred.promise;
  }
};

module.exports = new service();
