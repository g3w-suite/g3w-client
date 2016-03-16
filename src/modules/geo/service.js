var LayersStore = require('./layers.store');

// Private internal instance
var private = new _service();

// Public interface
function service(){
  var self = this;
  this.setup = function(config){
    private.setup(config)
    .then(function(){
      self.emit("loaded");
    });
  };
  this.getLayersStore = function(){
    return private.layersStore();
  }
};

// Make the public service en Event Emitter
heir.inherit(service,EventEmitter);

// Private interface
function _service(){
  this.initialized = false;
  this.groupConfig = null;
  this.currentProject = null;
  this.layersStore = null;
};

_service.prototype.setup = function(groupConfig){
  if (!this.initialized){
    this.groupConfig = groupConfig;
    return this.loadProject(groupConfig.initproject);
  }
};

_service.prototype.loadProject = function(id){
  if (this.projectAvailable(id)) {
    var self = this;
    return this.getProjectConfig(id)
    .then(function(projectConfig){
      this.currentProject = projectConfig;
      this.layersStore = LayersStore({
        layers: projectConfig.layers,
        layersTree: projectConfig.layerstree
      })
      this.initialized = true;
      // test
      console.log(this.currentProject.name);
      var layers = this.layersStore.getLayers();
      console.log(layers[0].name);
    });
  }
};

_service.prototype.projectAvailable = function(id){
  var exists = false;
  _.forEach(this.groupConfig.projects,function(project){
    if (project.id == id){
      exists = true;
    }
  });
  return exists;
};

_service.prototype.getProjectConfig = function(id){
  var self = this;
  var deferred = Q.defer();
  setTimeout(function(){
      var projectConfig = require('./test.project_config');
      deferred.resolve(projectConfig);
  },100)
  return deferred.promise;
};

module.exports = new service();
