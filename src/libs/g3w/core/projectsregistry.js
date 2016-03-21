var inherit = require('g3w/core/utils').inherit;
//oggetto che restituisce layers e layerstree
var Project = require('./project');

/* service
Funzione costruttore contentente tre proprieta':
    setup: metodo di inizializzazione
    getLayersStore: ritorna l'oggetto LayersStore
    getLayersTree: ritorna l'array layersTree dall'oggetto LayersStore
*/

// Public interface
function ProjectsRegistry(){
  var self = this;
  this.currentProject = null;
  
  this.mainProject = null;
  //config generale
  this.setup = function(config){
    _registry.setup(config)
    .then(function(){ //si risolve quando è stato caricato il progetto
      self.currentProject = _registry.currentProject;
      self.emit("loaded");
    });
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
  initialized: false,
  config: null,
  projects: [],
  currentProject: {
    gid: null
  },
  //config generale
  setup: function(config){
    if (!this.initialized){
      this.config = config;
      //carica il progetto della proprietà initiproject
      return this.addProject(config.group.initproject,true);
    }
  },
  
  addProject: function(projectGid, setAsCurrent){
    var projectBaseConfig = this.getProjectBaseConfig(projectGid);
    if (projectBaseConfig) {
      var self = this;
      return this.getProjectFullConfig(projectBaseConfig)
      .then(function(projectFullConfig){
        var project = new Project(projectFullConfig);
        self.projects.push(project);
        if (setAsCurrent) {
          self.currentProject.gid = project.gid;
        }
        self.initialized = true;
      });
    }
  },
  
  getProject: function(projectGid){
    var project = null;
    this.projects.forEach(function(projectInstance){
      if (projectInstance.gid == projectGid) {
        project = projectInstance;
      }
    })
    return project;
  },
  
  projectExists: function(projectGid){
    var exists = false;
    this.config.group.projects.forEach(function(project){
      if (project.gid == projectGid) {
        exists = true;
      }
    })
    return exists;
  },
  
  setCurrentProject: function(projectGid){
    var self = this;
    if(!this.projectExists(projectGid)){
      return;
    }
    var project = this.getProject(projectGid)
    if (project){
      this.currentProject.gid = project.gid;
    }
    else{
      this.addProject(projectGid,true);
    }
  },
  
  getProjectBaseConfig: function(projectGid){
    var projectBaseConfig = null;
    _.forEach(this.config.group.projects,function(project){
      if (project.gid == projectGid){
        projectBaseConfig = project;
      }
    });
    return projectBaseConfig;
  },
  
  //ritorna una promises
  getProjectFullConfig: function(projectBaseConfig){
    var self = this;
    var deferred = Q.defer();
    //nel caso di test locale
    if (this.config.client.local){
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
