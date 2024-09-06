/**
 * @file Store QGIS project configurations (enabled map controls / plugins / layers / ...)
 * @since v3.6
 */

import G3WObject                   from 'core/g3w-object';
import CatalogLayersStoresRegistry from 'store/catalog-layers';
import { XHR }                     from 'utils/XHR';

const Project           = require('core/project/project');

export default new (class ProjectsRegistry extends G3WObject {
  
  constructor() {
    super();

    this.config              = null;
    this.initialized         = false;

    /** store overview (Panoramic map) project */
    this.overviewproject     = undefined;

    this.setters = {

      setCurrentProject(project) {

        const { MapLayersStoresRegistry } = require('gui/map/mapservice');

        if (project !== this.state.currentProject ) {
          CatalogLayersStoresRegistry.removeLayersStores();
          MapLayersStoresRegistry.removeLayersStores();
        }

        this.state.currentProject = project;
        this.state.qgis_version   = project.getQgisVersion();

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

  getConfig() {
    return this.config;
  }

  getState() {
    return this.state;
  }

  /** used by the following plugins: "iframe", "archiweb" */
  getListableProjects() {
    return this._groupProjects.filter(p => {
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

  /** used by the following plugins: "ifram", "archiweb" */
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
    const config    = await XHR.get({ url:
      `${window.initConfig.urls.baseurl}${window.initConfig.urls.config}/${window.initConfig.id}/${pendingProject.type}/${pendingProject.id}?_t=${pendingProject.modified}`
    });
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

    project.WMSUrl = `${window.initConfig.urls.baseurl}${window.initConfig.urls.ows}/${window.initConfig.id}/${project.type}/${project.id}/`;

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

    // add to project
    return new Project(project);
  }

  /** used by the following plugins: "archiweb" */
  setProjectAliasUrl(alias) {
    const project = window.initConfig.projects.find(p => alias.gid === p.gid);
    if (project) { project.url = `${alias.host || ''}${alias.url}` }
  }

  /**
   * @param gid
   * 
   * @returns {string}
   */
  getProjectUrl(gid) {
    const project = this._groupProjects.find(p => gid === p.gid);
    try {
      return `${(new URL(window.initConfig.urls.baseurl))}${project.url}`;
    } catch(e) {
      console.warn(e);
      return `${location.origin}${window.initConfig.urls.baseurl}${project.url}`;
    }
  }

});