var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var resolve = require('core/utils/utils').resolve;
var reject = require('core/utils/utils').reject;
var G3WObject = require('core/g3wobject');
var Project = require('core/project/project');


/* service
Funzione costruttore contentente tre proprieta':
    setup: metodo di inizializzazione
    getLayersState: ritorna l'oggetto LayersState
    getLayersTree: ritorna l'array layersTree dall'oggetto LayersState
*/

// Public interface
function ProjectsRegistry() {

  var self = this;
  this.config = null;
  this.initialized = false;
  //tipo di progetto
  this.projectType = null;
  
  this.setters = {
    setCurrentProject: function(project){
      self.state.currentProject = project;
    }
  };
  //stato del registro progetti
  this.state = {
    baseLayers: {},
    minScale: null,
    maxscale: null,
    currentProject: null
  };
  
  // tutte le configurazioni di base dei progetti, ma di cui non è detto che
  // sia ancora disponibile l'istanza (lazy loading)
  this._pendingProjects = [];
  this._projects = {};
  
  base(this);
}
inherit(ProjectsRegistry, G3WObject);

var proto = ProjectsRegistry.prototype;

proto.init = function(config) {

  var self = this;
  //verifico se è già stato inizilizzato
  if (!this.initialized){
    this.initialized = true;
    //salva la configurazione
    this.config = config;
    //setta lo state
    this.setupState();
    return this.getProject(config.initproject)
    .then(function(project) {
      self.setCurrentProject(project);
      //aggiunto tipo progetto
      self.setProjectType(project.state.type);
    });
  }
};

proto.setProjectType = function(projectType) {
   this.projectType = projectType;
};

proto.setupState = function() {

  var self = this;
  
  self.state.baseLayers = self.config.baselayers;
  self.state.minScale = self.config.minscale;
  self.state.maxScale = self.config.maxscale;
  self.state.crs = self.config.crs;
  self.state.proj4 = self.config.proj4;

  // setto  quale progetto deve essere impostato come overview
  //questo è settato da django-admin
  var overViewProject = (self.config.overviewproject && self.config.overviewproject.gid) ? self.config.overviewproject : null;
  //per ogni progetto ciclo e setto tutti gli attributi comuni
  // come i base layers etc ..
  self.config.projects.forEach(function(project){
    project.baselayers = self.config.baselayers;
    project.minscale = self.config.minscale;
    project.maxscale = self.config.maxscale;
    project.crs = self.config.crs;
    project.proj4 = self.config.proj4;
    project.overviewprojectgid = overViewProject;
    //aggiungo tutti i progetti ai pending project
    self._pendingProjects.push(project);
  });
};

proto.getProjectType = function() {
  return this.projectType;
};

proto.getPendingProjects = function() {
  return this._pendingProjects;
};

proto.getCurrentProject = function(){
  return this.state.currentProject;
};

// ottengo il progetto dal suo gid;
// ritorna una promise nel caso non fosse stato ancora scaricato
// il config completo (e quindi non sia ancora istanziato Project)
proto.getProject = function(projectGid) {
  var self = this;
  var d = $.Deferred();
  var pendingProject = false;
  var project = null;
  // scorro atraverso i pending project che contengono oggetti
  // di configurazione dei progetti del gruppo
  this._pendingProjects.forEach(function(_pendingProject) {
    if (_pendingProject.gid == projectGid) {
      pendingProject = _pendingProject;
      project = self._projects[projectGid];
    }
  });
  if (!pendingProject) {
    return reject("Project doesn't exist");
  }

  if (project) {
    return d.resolve(project);
  } else {
    return this._getProjectFullConfig(pendingProject)
    .then(function(projectFullConfig){
      var projectConfig = _.merge(pendingProject,projectFullConfig);
      self._buildProjectTree(projectConfig);
      projectConfig.WMSUrl = self.config.getWmsUrl(projectConfig);
      var project = new Project(projectConfig);
      self._projects[projectConfig.gid] = project;
      return d.resolve(project);
    });
  }
  
  return d.promise();
};
  
//ritorna una promises
proto._getProjectFullConfig = function(projectBaseConfig) {
  var self = this;
  var deferred = $.Deferred();
  var url = this.config.getProjectConfigUrl(projectBaseConfig);
  $.get(url).done(function(projectFullConfig) {
      deferred.resolve(projectFullConfig);
  });
  return deferred.promise();
};

proto._buildProjectTree = function(project){
  var layers = _.keyBy(project.layers,'id');
  var layersTree = _.cloneDeep(project.layerstree);
  
  function traverse(obj){
    _.forIn(obj, function (layer, key) {
      //verifica che il nodo sia un layer e non un folder
      if (!_.isNil(layer.id)) {
          var fulllayer = _.merge(layer,layers[layer.id]);
          obj[parseInt(key)] = fulllayer;
      }
      if (!_.isNil(layer.nodes)){
        // aggiungo proprietà title per l'albero
        layer.title = layer.name;
        traverse(layer.nodes);
      }
    });
  }
  traverse(layersTree);
  project.layerstree = layersTree;
};

module.exports = new ProjectsRegistry();
