const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const G3WObject = require('core/g3wobject');
const Project = require('core/project/project');
const CatalogLayersStoresRegistry = require('core/catalog/cataloglayersstoresregistry');
const MapLayersStoresRegistry = require('core/map/maplayersstoresregistry');

/* service
    setup: init method
    getLayersState: returnLayersState
    getLayersTree: retunr  array of layersTree from LayersState
*/

// Public interface
function ProjectsRegistry() {
  this.config = null;
  this.initialized = false;
  this.projectType = null;
  this.overviewproject;
  this.setters = {
    setCurrentProject: function(project) {
      if (this.state.currentProject !== project) {
        CatalogLayersStoresRegistry.removeLayersStores();
        MapLayersStoresRegistry.removeLayersStores();
      }
      this.state.currentProject = project;
      this.state.qgis_version = project.getQgisVersion();
      this.setProjectType(project.state.type);
      const projectLayersStore = project.getLayersStore();
      //set in first position (catalog)
      CatalogLayersStoresRegistry.addLayersStore(projectLayersStore, 0);
      //set in first position (map)
      MapLayersStoresRegistry.addLayersStore(projectLayersStore, 0);
    }
  };

  this.state = {
    baseLayers: {},
    minScale: null,
    maxscale: null,
    currentProject: null,
    qgis_version: null
  };

  // (lazy loading)
  this._groupProjects = [];
  this._projectConfigs = {};

  base(this);
}

inherit(ProjectsRegistry, G3WObject);

const proto = ProjectsRegistry.prototype;

//Inizialize configuration for all project belong to group
proto.init = function(config={}) {
  const d = $.Deferred();
  //check if already initialized
  if (!this.initialized) {
    this.config = config;
    this.overviewproject = config.overviewproject;
    this.setupState();
    // get current configuration
    this.getProject(config.initproject)
    .then(project => {
      // set current project
      this.setCurrentProject(project);
      this.initialized = true;
      d.resolve(project);
    })
    .fail(error => {
      d.reject(error);
    })
  } else {
    const project = this.getCurrentProject();
    d.resolve(project);
  }
  return d.promise();
};

proto.clear = function(){
  this.config = null;
  this.initialized = false;
  this.projectType = null;
  this.overviewproject;
  this.initialized = false;
  this._groupProjects = [];
  this._projectConfigs = {};
  this.state = {
    baseLayers: {},
    minScale: null,
    maxscale: null,
    currentProject: null,
    qgis_version: null
  };
};

proto.setProjectType = function(projectType) {
   this.projectType = projectType;
};

proto.getConfig = function() {
  return this.config;
};

proto.getState = function() {
  return this.state;
};

proto.setupState = function() {
  this.state.baseLayers = this.config.baselayers;
  this.state.minScale = this.config.minscale;
  this.state.maxScale = this.config.maxscale;
  this.state.crs = this.config.crs;
  this.setProjects(this.config.projects);
};

proto.getProjectAliasUrl = function(gid) {
  const project = this.config.projects.find(project => project.gid === gid);
  return project.aliasUrl;
};

proto.setProjectAliasUrl = function({gid, url, host}) {
  const project = this.config.projects.find(project => project.gid === gid);
  if (project) project.aliasUrl = project && `${host? host : ''}${url}`;
};

proto.getProjectType = function() {
  return this.projectType;
};

proto.getProjects = function() {
  return this._groupProjects;
};

proto.setProjects = function(projects) {
  this.clearProjects();
  projects.forEach((project) => {
    this.state.qgis_version = project.qgis_version || this.state.qgis_version;
    project.aliasUrl = project.url || null;
    project.baselayers = this.config.baselayers;
    project.minscale = this.config.minscale;
    project.maxscale = this.config.maxscale;
    project.crs = this.config.crs;
    project.vectorurl = this.config.vectorurl;
    project.overviewprojectgid = this.overviewproject ? this.overviewproject.gid : null;
    this._groupProjects.push(project);
  });
};

proto.clearProjects = function() {
  this._groupProjects = [];
};

proto.getListableProjects = function() {
  const currentProjectId = this.getCurrentProject().getId();
  return _.sortBy(this.getProjects().filter((project) => {
    if (!_.isNil(project.listable)) return project.listable;
    if (project.id === currentProjectId || (project.overviewprojectgid && project.gid === project.overviewprojectgid)) return false
    return project;
  }), 'title')
};

proto.getCurrentProject = function() {
  return this.state.currentProject;
};

proto.getProject = function(projectGid) {
  const d = $.Deferred();
  const pendingProject = this._groupProjects.find((project) => {
    return project.gid === projectGid;
  });
  if (!pendingProject) {
    d.reject("Project doesn't exist");
    return d.promise();
  }
  const projectConfig = this._projectConfigs[projectGid];
  if (projectConfig) {
    const project = new Project(projectConfig);
    d.resolve(project);
  } else {
    this._getProjectFullConfig(pendingProject)
      .then((projectFullConfig) => {
        const projectConfig = _.merge(pendingProject, projectFullConfig);
        projectConfig.WMSUrl = this.config.getWmsUrl(projectConfig);
        // setupu project relations
        projectConfig.relations = this._setProjectRelations(projectConfig);
        this._projectConfigs[projectConfig.gid] = projectConfig;
        // instance of Project
        const project = new Project(projectConfig);
        // add to project
        d.resolve(project);
      })
      .fail((error) => {
        d.reject(error);
      })
  }
  return d.promise();
};

proto._setProjectRelations = function(projectConfig) {
  projectConfig.relations = projectConfig.relations ? projectConfig.relations : [];
  projectConfig.relations = projectConfig.relations.map((relation) => {
    if (relation.type === "ONE") {
      projectConfig.layers.find((layer) => {
        if (layer.id === relation.referencingLayer) {
          relation.name = layer.name;
          relation.origname = layer.origname;
          return true;
        }
      })
    }
    return relation
  });
  return projectConfig.relations;
};

proto.getProjectConfigByGid = function(gid) {
  return this._groupProjects.find((project) => {
    return project.gid === gid;
  })
};

proto.getProjectUrl = function(gid) {
  const projectConfig = this.getProjectConfigByGid(gid);
  const projecId = projectConfig.gid.split(':')[1];
  const type = projectConfig.type;
  const currentUrl = window.location.href;
  const paths = currentUrl.split('/');
  if (!paths[ paths.length-1 ]) {
    paths[ paths.length-2 ] = projecId;
    paths[ paths.length-3 ] = type;
  } else {
    paths[ paths.length-1 ] = projecId;
    paths[ paths.length-2 ] = type;
  }
  return paths.join('/');
};

// method to call server to get project configuration
proto._getProjectFullConfig = function(projectBaseConfig) {
  const d = $.Deferred();
  const url = this.config.getProjectConfigUrl(projectBaseConfig);
  $.get(url)
    .done((projectFullConfig) => {
      d.resolve(projectFullConfig);
    })
    .fail((error) => {
      d.reject(error);
    });
  return d.promise();
};

module.exports = new ProjectsRegistry();
