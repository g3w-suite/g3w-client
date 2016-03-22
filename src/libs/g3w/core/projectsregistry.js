var inherit = require('./utils').inherit;
var ProjectService = require('./projectservice');

/* service
Funzione costruttore contentente tre proprieta':
    setup: metodo di inizializzazione
    getLayersStore: ritorna l'oggetto LayersStore
    getLayersTree: ritorna l'array layersTree dall'oggetto LayersStore
*/

// Public interface
function ProjectsRegistry(){
  var self = this;
  this.store = _registry.store;
  //config generale
  this.setup = function(config){
    _registry.setup(config).then(function(){
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
    var a = this.a;
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
  initialized: false,
  config: null,
  testing: true,
  store: {
    currentProject:'',
    common: {},
    projects: []
  },
  //config generale
  setup: function(config){
    if (!this.initialized){
      testing = config.client.local;
      this.setupStore(config);
      return this.setCurrentProject(config.group.initproject);
    }
  },
  
  setupStore: function(config){
    this.store.common.baseLayers = config.group.baselayers;
    this.store.common.minScale = config.group.minscale;
    this.store.common.maxScale = config.group.maxscale;
    this.store.common.crs = config.group.crs;
    this.store.projects = config.group.projects;
  },
  
  setCurrentProject: function(projectGid){
    var project = this.getProject(projectGid);
    if(!project){
      return Q.reject("Project doesn't exist");
    }
    var isFullFilled = !_.isNil(project.layers);
    if (isFullFilled){
      this.currentProject = project.gid;
      ProjectService.setProject(project);
      return Q(project);
    }
    else{
      return this.getProjectFullConfig(project)
      .then(function(projectFullConfig){
        project = _.merge(project,projectFullConfig);
        this.currentProject = project.gid;
        ProjectService.setProject(project);
      });
    }
  },
  
  getProject: function(projectGid){
    var project = null;
    this.store.projects.forEach(function(_project){
      if (_project.gid == projectGid) {
        project = _project;
      }
    })
    return project;
  },
  
  //ritorna una promises
  getProjectFullConfig: function(projectBaseConfig){
    var self = this;
    var deferred = Q.defer();
    //nel caso di test locale
    if (this.testing){
      setTimeout(function(){
        var projectFullConfig;
        if (projectBaseConfig.id == 'open_data_firenze'){
          projectFullConfig = require('./test.project_config');
        }
        else{
          projectFullConfig = require('./test.project_config_2');
        }
        deferred.resolve(projectFullConfig);
      },100);
    }//altrimenti nella realtà fa una chiamata al server e una volta ottenuto il progetto risolve l'oggetto defer
    else {
      var url = this.config.server.urls.config+'/'+this.config.group.id+'/'+projectBaseConfig.type+'/'+projectBaseConfig.id;
      $.get(url).done(function(projectFullConfig){
        deferred.resolve(projectFullConfig);
      })
    }
    return deferred.promise;
  },
};

module.exports = new ProjectsRegistry();
