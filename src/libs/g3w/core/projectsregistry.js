var inherit = require('./utils').inherit;
var base = require('g3w/core/utils').base;
var G3WObject = require('g3w/core/g3wobject');
var resolvedValue = require('./utils').resolvedValue;
var rejectedValue = require('./utils').rejectedValue;
var ProjectService = require('./projectservice');

/* service
Funzione costruttore contentente tre proprieta':
    setup: metodo di inizializzazione
    getLayersState: ritorna l'oggetto LayersState
    getLayersTree: ritorna l'array layersTree dall'oggetto LayersState
*/

// Public interface
function ProjectsRegistry(){
  var self = this;
  this.state = _registry.state;
  //config generale
  this.init = function(config){
    return _registry.init(config).then(function(){
      self.emit('loaded');
    })
  };
  
  this.addProject = function(projectGid){
    _registry.addProject(projectGid);
  };
  
  this.getProject = function(projectGid){
    return _registry.getProject(projectGid);
  };
  
  this.getCurrentProject = function(){
    return this.getProject(_registry.currentProject.gid);
  };
  
  this.setCurrentProject = function(projectGid){
    _registry.setCurrentProject(projectGid);
  };
  
  base(this);
}

// Make the public service en Event Emitter
inherit(ProjectsRegistry,G3WObject);

// Private
var _registry = {
  config: null,
  initialized: false,
  state: {
    baseLayers: {},
    minScale: null,
    maxscale: null,
    projects: []
  },
  //config generale
  init: function(config){
    if (!this.initialized){
      this.config = config;
      this.setupState();
      ProjectService.init(config);
      return this.setCurrentProject(config.initproject);
    }
  },
  
  setupState: function(){
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
  },
  
  setCurrentProject: function(projectGid){
    var self = this;
    var project = this.getProject(projectGid);
    if(!project){
      return rejectedValue("Project doesn't exist");
    }
    var isFullFilled = !_.isNil(project.layers);
    if (isFullFilled){
      ProjectService.setProject(project);
      return resolvedValue(project);
    }
    else{
      return this.getProjectFullConfig(project)
      .then(function(projectFullConfig){
        project = _.merge(project,projectFullConfig);
        self.buildProjectTree(project);
        ProjectService.setProject(project);
      });
    }
  },
  
  buildProjectTree: function(project){
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
  },

  getProject: function(projectGid){
    var project = null;
    this.state.projects.forEach(function(_project){
      if (_project.gid == projectGid) {
        project = _project;
      }
    })
    return project;
  },
  
  //ritorna una promises
  getProjectFullConfig: function(projectBaseConfig){
    var self = this;
    var deferred = $.Deferred();
    var url = this.config.getProjectConfigUrl(projectBaseConfig);
    $.get(url).done(function(projectFullConfig){
        deferred.resolve(projectFullConfig);
    })
    return deferred.promise();
  },
};

module.exports = new ProjectsRegistry();
