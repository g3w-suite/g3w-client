/**
 * @file Store QGIS project configurations (enabled map controls / plugins / layers / ...)
 * @since v3.6
 */

import G3WObject                   from 'core/g3w-object';
import CatalogLayersStoresRegistry from 'store/catalog-layers';
import { XHR }                     from 'utils/XHR';


const Project           = require('core/project/project');

/* service
    setup: init method
    getLayersState: returnLayersState
    getLayersTree: return array of layersTree from LayersState
*/

export default new (class ProjectsRegistry extends G3WObject {
  
  constructor() {
    super();

    this.config              = null;
    this.initialized         = false;
    this.projectType         = null;
    this.currentProjectGroup = null;
    /** store overview (Panoramic map) project */
    this.overviewproject     = undefined;

    this.setters = {

      createProject(projectConfig) {
        //hook to get project config and modify it
      },

      setCurrentProject(project) {

        const { MapLayersStoresRegistry } = require('gui/map/mapservice');

        if (project !== this.state.currentProject ) {
          CatalogLayersStoresRegistry.removeLayersStores();
          MapLayersStoresRegistry.removeLayersStores();
        }

        this.state.currentProject = project;
        this.state.qgis_version   = project.getQgisVersion();
        this.projectType          = project.state.type;

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
  }

  //Inizialize configuration for all projects belongs to group
  async init(config = {}) {

    // check if already initialized
    if (this.initialized) {
      return this.getCurrentProject();
    }

    this.config              = config;
    this.currentProjectGroup = config.group;
    this.overviewproject     = config.overviewproject;

    //setup state
    this.state.baseLayers = this.config.baselayers;
    this.state.minScale   = this.config.minscale;
    this.state.maxScale   = this.config.maxscale;
    this.state.crs        = this.config.crs;

    // clear projects
    this._groupProjects   = [];

    // setup projects
    this.config.projects.forEach(project => {
      this.state.qgis_version = project.qgis_version || this.state.qgis_version;
      Object.assign(project, {
        baselayers:         this.config.baselayers,
        minscale:           this.config.minscale,
        maxscale:           this.config.maxscale,
        crs:                this.config.crs,
        vectorurl:          this.config.vectorurl,
        rasterurl:          this.config.rasterurl,
        overviewprojectgid: this.overviewproject ? this.overviewproject.gid : null,
      });
      this._groupProjects.push(project);
    });

    const map_theme = (new URLSearchParams(location.search)).get('map_theme');

    // get current configuration
    const project = await this.getProject(config.initproject, { map_theme } );

    this.setCurrentProject(project);

    this.initialized = true;

    return project;

  }

  getConfig() {
    return this.config;
  }

  getState() {
    return this.state;
  }

  getProjects() {
    return this._groupProjects;
  }

  getListableProjects() {
    return this.getProjects().filter(p => {
      if (![null, undefined].includes(p.listable)) {
        return p.listable;
      }
      if ((p.overviewprojectgid && p.gid === p.overviewprojectgid) || p.id === this.getCurrentProject().getId()) {
        return false;
      }
      return p;
    }).sort((a, b) => (a.title || '').localeCompare(b.title));
  }

  getCurrentProject() {
    return this.state.currentProject;
  }

  /**
   * @since 3.8.0
   */
  getCurrentProjectGroup() {
    return this.currentProjectGroup;
  }

  getProjectConfigByGid(gid) {
    return this._groupProjects.find(p => gid === p.gid);
  }
  
  /**
   * Get project configuration
   *
   * @param { string } projectGid
   * @param options
   * @param { string } options.map_theme
   */
  async getProject(projectGid, options = {}) {
    const pendingProject = this._groupProjects.find(p => projectGid === p.gid);

    // skip if a project doesn't exist
    if (!pendingProject) {
      return Promise.reject("Project doesn't exist");
    }

    let project = this._projectConfigs[projectGid];

    /** @TODO add description */
    if (project) {
      return new Project(project);
    }

    // fetch project configuration from remote server
    const config    = await XHR.get({ url: this.config.getProjectConfigUrl(pendingProject) });
    const map_theme = options.map_theme && Object.values(config.map_themes).flat().find(({ theme }) => theme === options.map_theme);

    /** In the case of url param set map_theme, need to get map theme configuration from server */
    if (map_theme) {
      const { result, data } = await XHR.get({url: `/${pendingProject.type}/api/prjtheme/${pendingProject.id}/${options.map_theme}` });
      if (result) {
        config.layerstree    = data;
        map_theme.layetstree = data;
        map_theme.default    = true;
      }
    }

    project = Object.assign(pendingProject, config);

    project.WMSUrl = this.config.getWmsUrl(project);

    /** @since 3.8.0 */
    project.relations = (project.relations || []).map(r => {
      if ("ONE" === r.type) {
        project.layers.find(l => {
          if (l.id === r.referencingLayer) {
            r.name     = l.name;
            r.origname = l.origname;
            return true;
          }
        });
      }
      return r;
    });

    this._projectConfigs[project.gid] = project;

    // instance of Project
    this.createProject(project);

    // add to project
    return new Project(project);
  }

  /**
   * @param alias.gid
   * @param alias.url
   * @param alias.host
   */
  setProjectAliasUrl(alias) {
    const project = this.config.projects.find(p => alias.gid === p.gid);
    if (project) { project.url = `${alias.host || ''}${alias.url}` }
  }

  /**
   * @param gid
   * 
   * @returns {string}
   */
  getProjectUrl(gid) {
    const baseurl       = this.config && this.config.urls && this.config.urls.baseurl;
    const projectConfig = this.getProjectConfigByGid(gid);
    const url           = projectConfig.url;
    try {
      return `${(new URL(baseurl))}${url}`;
    } catch(e) {
      console.warn(e);
      return `${location.origin}${baseurl}${url}`;
    }
  }

  /**
   * @since 3.8.0
   */
  getBaseUrl() {
    return this.config.urls.baseurl;
  };

});