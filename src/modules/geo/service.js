var LayersStore = require('./layers.store');

function service(){
  var instance = new _service();
  return {
    setup: function(config){
      instance.setup(config);
    }
  }
};

function _service(){
  this.initialized = false;
  this.groupConfig = null;
  this.currentProject = null;
  this.layersStore = null;
};

_service.prototype.setup = function(groupConfig){
  if (!this.initialized){
    this.groupConfig = groupConfig;
    this.loadProject(groupConfig.initproject);
    this.initialized = true;
  }
};

_service.prototype.loadProject = function(id){
  if (this.projectAvailable(id)) {
    var self = this;
    this.getProjectConfig(id)
    .then(function(projectConfig){
      this.currentProject = projectConfig;
      this.layersStore = LayersStore({
        layers: projectConfig.layers,
        layersTree: projectConfig.layerstree
      })
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

module.exports = service();
