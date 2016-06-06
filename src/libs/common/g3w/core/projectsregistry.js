var inherit = require('./utils').inherit;
var base = require('g3w/core/utils').base;
var G3WObject = require('g3w/core/g3wobject');
var resolvedValue = require('./utils').resolvedValue;
var rejectedValue = require('./utils').rejectedValue;
var ProjectService = require('./projectservice').ProjectService;

/* service
Funzione costruttore contentente tre proprieta':
    setup: metodo di inizializzazione
    getLayersState: ritorna l'oggetto LayersState
    getLayersTree: ritorna l'array layersTree dall'oggetto LayersState
*/

// Public interface
function ProjectsRegistry(){
  var self = this;
  this.config = null;
  this.initialized = false;
  
  this.setters = {
    setCurrentProject: function(project){
      this.state.currentProject = project;
    }
  };
  
  this.state = {
    baseLayers: {},
    minScale: null,
    maxscale: null,
    projects: [],
    currentProject: null
  }
  
  base(this);
}
inherit(ProjectsRegistry,G3WObject);

var proto = ProjectsRegistry.prototype;

proto.init = function(config){
  if (!this.initialized){
    this.initialized = true;
    this.config = config;
    this.setupState();
    ProjectService.init(config);
    return this.setProject(config.initproject);
  }
};
  
proto.setupState = function(){
  var self = this;
  
  self.state.baseLayers = self.config.baselayers;
  self.state.minScale = self.config.minscale;
  self.state.maxScale = self.config.maxscale;
  self.state.crs = self.config.crs;
  self.config.projects.forEach(function(project){
    project.baseLayers = self.config.baselayers;
    project.minScale = self.config.minscale;
    project.maxScale = self.config.maxscale;
    project.crs = self.config.crs;
    self.state.projects.push(project);
  })
  //this.state.projects = config.group.projects;
};

proto.getCurrentProject = function(){
  return this.state.currentProject;
};
  
proto.setProject = function(projectGid){
  var self = this;
  return this.getProject(projectGid).
  then(function(project){
    ProjectService.setProject(project);
    self.setCurrentProject(project);
  })
};
  
proto.switchProject = function(projectGid) {
  var self = this;
  return this.getProject(projectGid).
  then(function(project){
    ProjectService.switchProject(project);
    self.setCurrentProject(project);
  })
};
  
proto.buildProjectTree = function(project){
  var layers = _.keyBy(project.layers,'id');
  var layersTree = _.cloneDeep(project.layerstree);
  
  function traverse(obj){
    _.forIn(obj, function (layer, key) {
        //verifica che il nodo sia un layer e non un folder
        if (!_.isNil(layer.id)) {
            var fulllayer = _.merge(layer,layers[layer.id]);
            obj[parseInt(key)] = fulllayer;
            var a =1;
        }
        if (!_.isNil(layer.nodes)){
          // aggiungo proprietà title per l'albero
          layer.title = layer.name;
          traverse(layer.nodes);
        }
      });
    };
  traverse(layersTree);
  project.layerstree = layersTree;
};

proto.getProject = function(projectGid){
  var self = this;
  var d = $.Deferred();
  var project = null;
  this.state.projects.forEach(function(_project){
    if (_project.gid == projectGid) {
      project = _project;
    }
  })
  if (!project) {
    return rejectedValue("Project doesn't exist");
  }

  var isFullFilled = !_.isNil(project.layers);
  if (isFullFilled){
    return d.resolve(project);
  }
  else{
    return this.getProjectFullConfig(project)
    .then(function(projectFullConfig){
      project = _.merge(project,projectFullConfig);
      self.buildProjectTree(project);
      return d.resolve(project);
    });
  }
  
  return d.promise();
};
  
  //ritorna una promises
proto.getProjectFullConfig = function(projectBaseConfig){
  var self = this;
  var deferred = $.Deferred();
  var url = this.config.getProjectConfigUrl(projectBaseConfig);
  $.get(url).done(function(projectFullConfig){
      deferred.resolve(projectFullConfig);
  })
  return deferred.promise();
};

module.exports = new ProjectsRegistry();
