import G3WObject from 'core/g3wobject';
import Project from 'core/project/project';
import CatalogLayersStoresRegistry from 'core/catalog/cataloglayersstoresregistry';
import MapLayersStoresRegistry from 'core/map/maplayersstoresregistry';

/* service
    setup: init method
    getLayersState: returnLayersState
    getLayersTree: retunr  array of layersTree from LayersState
*/

// Public interface
class ProjectsRegistry extends G3WObject {
  constructor() {
    super({
      setters: {
        createProject(projectConfig) {
          // hook to get project config and modify it
        },
        setCurrentProject(project) {
          if (this.state.currentProject !== project) {
            CatalogLayersStoresRegistry.removeLayersStores();
            MapLayersStoresRegistry.removeLayersStores();
          }
          this.state.currentProject = project;
          this.state.qgis_version = project.getQgisVersion();
          this.setProjectType(project.state.type);
          const projectLayersStore = project.getLayersStore();
          // set in first position (catalog)
          CatalogLayersStoresRegistry.addLayersStore(projectLayersStore, 0);
          // set in first position (map)
          MapLayersStoresRegistry.addLayersStore(projectLayersStore, 0);
        },
      },
    });
    this.config = null;
    this.initialized = false;
    this.projectType = null;
    this.overviewproject;

    this.state = {
      baseLayers: {},
      minScale: null,
      maxscale: null,
      currentProject: null,
      qgis_version: null,
    };

    // (lazy loading)
    this._groupProjects = [];
    this._projectConfigs = {};
  }

  // Inizialize configuration for all project belong to group
  init(config = {}) {
    const d = $.Deferred();
    // check if already initialized
    if (!this.initialized) {
      this.config = config;
      this.overviewproject = config.overviewproject;
      this.setupState();
      // get current configuration
      const searchParams = new URLSearchParams(location.search);
      const map_theme = searchParams.get('map_theme');
      this.getProject(config.initproject, {
        map_theme,
      })
        .then((project) => {
          // set current project

          this.setCurrentProject(project);
          this.initialized = true;
          d.resolve(project);
        })
        .fail((error) => d.reject(error));
    } else {
      const project = this.getCurrentProject();
      d.resolve(project);
    }
    return d.promise();
  }

  clear() {
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
      qgis_version: null,
    };
  }

  setProjectType(projectType) {
    this.projectType = projectType;
  }

  getConfig() {
    return this.config;
  }

  getState() {
    return this.state;
  }

  setupState() {
    this.state.baseLayers = this.config.baselayers;
    this.state.minScale = this.config.minscale;
    this.state.maxScale = this.config.maxscale;
    this.state.crs = this.config.crs;
    this.setProjects(this.config.projects);
  }

  getProjectType() {
    return this.projectType;
  }

  getProjects() {
    return this._groupProjects;
  }

  setProjects(projects) {
    this.clearProjects();
    projects.forEach((project) => {
      this.state.qgis_version = project.qgis_version || this.state.qgis_version;
      project.baselayers = this.config.baselayers;
      project.minscale = this.config.minscale;
      project.maxscale = this.config.maxscale;
      project.crs = this.config.crs;
      project.vectorurl = this.config.vectorurl;
      project.rasterurl = this.config.rasterurl;
      project.overviewprojectgid = this.overviewproject ? this.overviewproject.gid : null;
      this._groupProjects.push(project);
    });
  }

  clearProjects() {
    this._groupProjects = [];
  }

  getListableProjects() {
    const currentProjectId = this.getCurrentProject().getId();
    return _.sortBy(this.getProjects().filter((project) => {
      if (!_.isNil(project.listable)) return project.listable;
      if (project.id === currentProjectId || (project.overviewprojectgid && project.gid === project.overviewprojectgid)) return false;
      return project;
    }), 'title');
  }

  getCurrentProject() {
    return this.state.currentProject;
  }

  // method to get project configuration - added reload to force to get configuratn project from server
  getProject(projectGid, options = { reload: false }) {
    const { reload, map_theme } = options;
    const d = $.Deferred();
    const pendingProject = this._groupProjects.find((project) => project.gid === projectGid);
    if (!pendingProject) {
      d.reject("Project doesn't exist");
      return d.promise();
    }
    const projectConfig = !reload && this._projectConfigs[projectGid];
    if (projectConfig) {
      const project = new Project(projectConfig);
      d.resolve(project);
    } else {
      this._getProjectFullConfig(pendingProject, { map_theme })
        .then((projectFullConfig) => {
          const projectConfig = _.merge(pendingProject, projectFullConfig);
          projectConfig.WMSUrl = this.config.getWmsUrl(projectConfig);
          // setupu project relations
          projectConfig.relations = this._setProjectRelations(projectConfig);
          this._projectConfigs[projectConfig.gid] = projectConfig;
          // instance of Project
          this.createProject(projectConfig);
          const project = new Project(projectConfig);
          // add to project
          d.resolve(project);
        })
        .fail((error) => d.reject(error));
    }
    return d.promise();
  }

  _setProjectRelations(projectConfig) {
    projectConfig.relations = projectConfig.relations ? projectConfig.relations : [];
    projectConfig.relations = projectConfig.relations.map((relation) => {
      if (relation.type === 'ONE') {
        projectConfig.layers.find((layer) => {
          if (layer.id === relation.referencingLayer) {
            relation.name = layer.name;
            relation.origname = layer.origname;
            return true;
          }
        });
      }
      return relation;
    });
    return projectConfig.relations;
  }

  getProjectConfigByGid(gid) {
    return this._groupProjects.find((project) => project.gid === gid);
  }

  setProjectAliasUrl({ gid, url, host }) {
    const project = this.config.projects.find((project) => project.gid === gid);
    if (project) project.url = project && `${host || ''}${url}`;
  }

  /**
   *
   * @param gid
   * @param mode production or development
   * @returns {string}
   */
  getProjectUrl(gid) {
    // get base url
    const { urls: { baseurl } } = this.config;
    // get project configuration in initConfig group projects
    const projectConfig = this.getProjectConfigByGid(gid);
    const { url } = projectConfig;
    const { origin } = location;
    return `${origin}${baseurl}${url}`;
  }

  // method to call server to get project configuration
  _getProjectFullConfig(projectBaseConfig, options = {}) {
    const { map_theme } = options;
    const d = $.Deferred();
    const url = this.config.getProjectConfigUrl(projectBaseConfig);
    $.get(url)
      .done((projectFullConfig) => {
        if (map_theme) {
          const { type, id } = projectBaseConfig;
          const { map_themes } = projectFullConfig;
          const find_map_theme = map_themes.find(({ theme }) => theme === map_theme);
          if (find_map_theme) {
            const url_theme = `/${type}/api/prjtheme/${id}/${map_theme}`;
            $.get(url_theme).done(({ result, data: layerstree }) => {
              if (result) {
                projectFullConfig.layerstree = layerstree;
                find_map_theme.layetstree = layerstree;
                find_map_theme.default = true;
              }
            }).always(() => {
              d.resolve(projectFullConfig);
            });
          }
        } else d.resolve(projectFullConfig);
      })
      .fail((error) => d.reject(error));
    return d.promise();
  }
}

export default new ProjectsRegistry();
