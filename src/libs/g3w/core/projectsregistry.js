var inherit = require('./utils').inherit;
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
  }
}

// Make the public service en Event Emitter
inherit(ProjectsRegistry,EventEmitter);

// Private
var _registry = {
  ctx: null,
  initialized: false,
  state: {
    baseLayers: {},
    minScale: null,
    maxscale: null,
    projects: []
  },
  //config generale
  init: function(ctx){
    if (!this.initialized){
      this.ctx = ctx;
      this.setupState();
      ProjectService.init(ctx);
      return this.setCurrentProject(ctx.initproject);
    }
  },
  
  setupState: function(){
    var self = this;
    
    self.state.baseLayers = self.ctx.baselayers;
    self.state.minScale = self.ctx.minscale;
    self.state.maxScale = self.ctx.maxscale;
    self.state.crs = self.ctx.crs;
    self.ctx.projects.forEach(function(project){
      project.baseLayers = self.ctx.baselayers;
      project.minScale = self.ctx.minscale;
      project.maxScale = self.ctx.maxscale;
      project.crs = self.ctx.crs;
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
    var url = this.ctx.getProjectConfigUrl(projectBaseConfig);
    $.get(url).done(function(projectFullConfig){
        deferred.resolve(projectFullConfig);
    })
    return deferred.promise();
  },
};

module.exports = new ProjectsRegistry();
