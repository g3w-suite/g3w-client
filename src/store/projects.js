/**
 * @file Store QGIS project configurations (enabled map controls / plugins / layers / ...)
 * @since v3.6
 */

import CatalogLayersStoresRegistry from 'store/catalog-layers';
import MapLayersStoresRegistry from 'store/map-layers';

const { base, inherit } = require('utils');
const G3WObject = require('core/g3wobject');
const Project = require('core/project/project');

/* service
    setup: init method
    getLayersState: returnLayersState
    getLayersTree: return  array of layersTree from LayersState
*/

// Public interface
function ProjectsRegistry() {

  this.config              = null;
  this.initialized         = false;
  this.projectType         = null;
  this.currentProjectGroup = null;
  //store overview (Panoramic map) project
  this.overviewproject     = undefined;

  this.setters = {

    createProject(projectConfig) {
      //hook to get project config and modify it
    },

    setCurrentProject(project) {

      if (this.state.currentProject !== project) {
        CatalogLayersStoresRegistry.removeLayersStores();
        MapLayersStoresRegistry.removeLayersStores();
      }

      this.state.currentProject = project;
      this.state.qgis_version   = project.getQgisVersion();

      this.setProjectType(project.state.type);

      const projectLayersStore = project.getLayersStore();

      //set in first position (catalog)
      CatalogLayersStoresRegistry.addLayersStore(projectLayersStore, 0);

      //set in first position (map)
      MapLayersStoresRegistry.addLayersStore(projectLayersStore, 0);
    }

  };

  this.state = {
    baseLayers:     {},
    minScale:       null,
    maxscale:       null,
    currentProject: null,
    qgis_version:   null
  };

  // (lazy loading)
  this._groupProjects  = [];
  this._projectConfigs = {};

  //Inizialize configuration for all project belong to group
  this.init = function(config = {}) {
    const d = $.Deferred();

    // check if already initialized
    if (this.initialized) {
      d.resolve(this.getCurrentProject());
      return d.promise();
    }

    this.config              = config;
    this.currentProjectGroup = config.group;
    this.overviewproject     = config.overviewproject;

    this.setupState();

    // get current configuration
    this
      .getProject(
        config.initproject,
        { map_theme: (new URLSearchParams(location.search)).get('map_theme') }
      )
      .then(project => {
        this.setCurrentProject(project);
        this.initialized = true;
        d.resolve(project);
      })
      .fail(error => d.reject(error));

    return d.promise();
  };

  this.clear = function() {
    this.config          = null;
    this.initialized     = false;
    this.projectType     = null;
    this.overviewproject = undefined;
    this.initialized     = false;
    this._groupProjects  = [];
    this._projectConfigs = {};
    this.state           = {
      baseLayers:     {},
      minScale:       null,
      maxscale:       null,
      currentProject: null,
      qgis_version:   null
    };
  };

  this.setProjectType = function(projectType) {
    this.projectType = projectType;
  };

  this.getConfig = function() {
    return this.config;
  };

  this.getState = function() {
    return this.state;
  };

  this.setupState = function() {
    this.state.baseLayers = this.config.baselayers;
    this.state.minScale   = this.config.minscale;
    this.state.maxScale   = this.config.maxscale;
    this.state.crs        = this.config.crs;
    this.setProjects(this.config.projects);
  };

  this.getProjectType = function() {
    return this.projectType;
  };

  this.getProjects = function() {
    return this._groupProjects;
  };

  this.setProjects = function(projects) {
    this.clearProjects();
    projects.forEach(project => {
      this.state.qgis_version    = project.qgis_version || this.state.qgis_version;
      project.baselayers         = this.config.baselayers;
      project.minscale           = this.config.minscale;
      project.maxscale           = this.config.maxscale;
      project.crs                = this.config.crs;
      project.vectorurl          = this.config.vectorurl;
      project.rasterurl          = this.config.rasterurl;
      project.overviewprojectgid = this.overviewproject ? this.overviewproject.gid : null;
      this._groupProjects.push(project);
    });
  };

  this.clearProjects = function() {
    this._groupProjects = [];
  };

  this.getListableProjects = function() {
    const currentProjectId = this.getCurrentProject().getId();
    return _
      .sortBy(this.getProjects()
      .filter(project => {
        if (!_.isNil(project.listable)) return project.listable;
        if (project.id === currentProjectId || (project.overviewprojectgid && project.gid === project.overviewprojectgid)) return false;
        return project;
      }), 'title');
  };

  this.getCurrentProject = function() {
    return this.state.currentProject;
  };

  /**
   * Get project configuration
   *  
   * @param {unknown} projectGid 
   * @param {unknown} options.map_theme
   * @param {boolean} [options.reload = false] `true` = force to get project configuration from server
   */
  this.getProject = function(projectGid, options = { reload:false}) {
    const d = $.Deferred();
    const pendingProject = this._groupProjects.find(project => project.gid === projectGid);

    // skipe if project doesn't exist
    if (!pendingProject) {
      d.reject("Project doesn't exist");
      return d.promise();
    }

    const projectConfig = !options.reload && this._projectConfigs[projectGid];

    /** @TODO add description */
    if (projectConfig) {
      d.resolve((new Project(projectConfig)));
      return d.promise();
    }

    this
      ._getProjectFullConfig(pendingProject, { map_theme: options.map_theme })
      .then(projectFullConfig => {

        const projectConfig = _.merge(pendingProject, projectFullConfig);
        projectConfig.WMSUrl    = this.config.getWmsUrl(projectConfig);
        projectConfig.relations = this._setProjectRelations(projectConfig);

        this._projectConfigs[projectConfig.gid] = projectConfig;

        // instance of Project
        this.createProject(projectConfig);

        // add to project
        d.resolve((new Project(projectConfig)));
      })
      .fail(error => d.reject(error))
    return d.promise();
  };

  this._setProjectRelations = function(projectConfig) {
    projectConfig.relations = (projectConfig.relations ? projectConfig.relations : [])
      .map(relation => {
        relation = this._updateRelation(projectConfig, relation);
        return relation;
      });
    return projectConfig.relations;
  };

  /**
   * @FIXME add description
   * 
   * @since 3.8.0
   */
  this._updateRelation = function(projectConfig, relation) {
    if ("ONE" === relation.type) {
      projectConfig.layers
      .find(layer => {
        if (layer.id === relation.referencingLayer) {
          relation.name     = layer.name;
          relation.origname = layer.origname;
          return true;
        }
      });
    }
    return relation;
  };

  this.getProjectConfigByGid = function(gid) {
    return this._groupProjects.find(project => project.gid === gid);
  };

  /**
   * @param alias.gid
   * @param alias.url
   * @param alias.host
   */
  this.setProjectAliasUrl = function(alias) {
    const project = this.config.projects.find(project => project.gid === alias.gid);
    if (project) {
      project.url = project && `${alias.host || ''}${alias.url}`;
    }
  };

  /**
   * @param gid
   * 
   * @returns {string}
   */
  this.getProjectUrl = function(gid) {
    const baseurl       = this.config && this.config.urls && this.config.urls.baseurl;
    const projectConfig = this.getProjectConfigByGid(gid);
    const url           = projectConfig.url;
    try {
      return `${(new URL(baseurl))}${url}`;
    } catch(err) {
      return `${location.origin}${baseurl}${url}`;
    }
  };

  /**
   * @since 3.8.0
   */
  this.getBaseUrl = function(){
    return this.config.urls.baseurl;
  };

  /**
   * Fetch project configuration from remote server 
   * 
   * @param config project base config 
   * @param options.map_theme
   */
  this._getProjectFullConfig = function(config, options={}) {
    const d = $.Deferred();

    $
      .get(this.config.getProjectConfigUrl(config))
      .done(serverConfig => {

        /** @TODO add description */
        if (!options.map_theme) {
          d.resolve(serverConfig);
          return;
        }

        const map_theme = serverConfig.map_themes.find(({theme}) => theme === options.map_theme);

        /** @TODO add description */
        if (map_theme) {
          $
            .get(`/${config.type}/api/prjtheme/${config.id}/${options.map_theme}`)
            .done(({result, data}) => {
              if (result) {
                serverConfig.layerstree = data;
                map_theme.layetstree    = data;
                map_theme.default       = true;
              }
            })
            .always(() => { d.resolve(serverConfig)});
        }

      })
      .fail(error => d.reject(error));

    return d.promise();
  };

  /**
   * @since 3.8.0
   */
  this.getCurrentProjectGroup = function(){
    return this.currentProjectGroup;
  };

  base(this);
}

inherit(ProjectsRegistry, G3WObject);

export default new ProjectsRegistry();