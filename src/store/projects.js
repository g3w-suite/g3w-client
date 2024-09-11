/**
 * @file Store QGIS project configurations (enabled map controls / plugins / layers / ...)
 * @since v3.6
 */

import { QUERY_POINT_TOLERANCE }   from 'g3w-constants';
import G3WObject                   from 'g3w-object';
import CatalogLayersStoresRegistry from 'store/catalog-layers';
import { XHR }                     from 'utils/XHR';
import ApplicationState            from 'store/application-state';
import Projections                 from 'store/projections';
import { normalizeEpsg }           from 'utils/normalizeEpsg';
import { toRawType }               from 'utils/toRawType';

const LayerFactory        = require('map/layers/layerfactory');
const LayersStore         = require('map/layers/layersstore');


/**
 * @param { number | string | null | undefined } crs
 * 
 * @returns { { epsg: string, proj4: string, axisinverted: boolean, geographic: boolean } | null | undefined } crs object
 */
function crsToCrsObject(crs) {

  /** @FIXME add description */
  if ([undefined, null].includes(crs)) {
    return crs;
  }

  /** @FIXME add description */
  if ('Object' === toRawType(crs) && crs.epsg) {
    crs.epsg = normalizeEpsg(crs.epsg);
    return crs;
  }

  return {
    epsg:         normalizeEpsg(crs),
    proj4:        "",
    axisinverted: false,
    geographic:   false
  };
}

export default new (class ProjectsRegistry extends G3WObject {
  
  constructor() {
    super();

    this.config              = null;
    this.initialized         = false;

    this.setters = {

      setCurrentProject(project) {

        const { MapLayersStoresRegistry } = require('services/map').default;

        if (project !== this.state.currentProject ) {
          CatalogLayersStoresRegistry.removeLayersStores();
          MapLayersStoresRegistry.removeLayersStores();
        }

        this.state.currentProject = project;
        this.state.qgis_version   = project.state.qgis_version;

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
      if ((window.initConfig.overviewproject && p.gid === window.initConfig.overviewproject) || p.id === this.getCurrentProject().getId()) {
        return false;
      }
      return p;
    }).sort((a, b) => (a.title || '').localeCompare(b.title));
  }

  getCurrentProject() {
    return this.state.currentProject;
  }

  /** used by the following plugins: "iframe", "archiweb" */
  getProjectConfigByGid(gid) {
    return this._groupProjects.find(p => gid === p.gid);
  }
  
  /**
   * ORIGINAL SOURCE: src/app/core/project/project.js@v3.10.2
   * 
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
      console.log("Project doesn't exist", projectGid)
      return Promise.reject("Project doesn't exist");
    }

    let project = this._projectConfigs[projectGid];

    /** @TODO add description */
    if (!project) {
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
    }

    const config = project;
    let _project = Object.assign(new G3WObject, {
      setters: {
        setBaseLayer(id) {
        this.state.baselayers.forEach(l => {
          this._layersStore.getLayerById(l.id).setVisible(id === l.id);
          l.visible = (id === l.id);
        })
        },
      },
      state: Object.assign(config, {
        /** actived catalog tab */
        catalog_tab:            config.toc_tab_default        || config._catalog_tab || 'layers',
        ows_method:             config.ows_method             || 'GET',
        toc_layers_init_status: config.toc_layers_init_status || 'not_collapsed',
        toc_themes_init_status: config.toc_themes_init_status || 'collapsed',
        query_point_tolerance:  config.query_point_tolerance  || QUERY_POINT_TOLERANCE,
        crs:                    crsToCrsObject(config.crs),
        baselayers:             config.baselayers
          // Remove bing base layer when no vendor API Key is provided
          .filter(l => ('Bing' === l.servertype ? ApplicationState.keys.vendorkeys.bing : true))
          .map(l => Object.assign(l, {
            visible:   l.id && (l.id === (null !== ApplicationState.baseLayerId ? ApplicationState.baseLayerId : config.initbaselayer)) || !!l.fixed,
            baselayer: true,
          })),
      }),
      /** project APIs */
      urls: {
        map_themes:      `/${config.type}/api/prjtheme/${config.id}/`,
        vector_data:     `${config.vectorurl}data/${config.type}/${config.id}/`,
        featurecount:    `${config.vectorurl}featurecount/${config.type}/${config.id}/`,
      },
      _projection:  Projections.get(crsToCrsObject(config.crs)),
      _layersStore: new LayersStore(),
      getQueryPointTolerance: () =>_project.state.query_point_tolerance,
      getRelations:           () =>_project.state.relations,
      getRelationById:        id => _project.state.relations.find(r => id === r.id),
      getLayerById:           id => _project._layersStore.getLayerById(id),
      getLayers:              () => [..._project.state.layers, ..._project.state.baselayers],
      /**
       * @param filter property layer config to filter
       * 
       * @returns { Array } configuration layers (from server config)
       */
      getConfigLayers:        ({ key } = {}) => key ? _project.state.layers.filter(l => undefined !== l[key] ) : _project.state.layers,
      getState:               () => _project.state,
      getPrint:               () => _project.state.print || [],
      getId:                  () => _project.state.id,
      getType:                () => _project.state.type,
      getGid:                 () => _project.state.gid,
      getName:                () => _project.state.name,
      getCrs:                 () => _project._projection.getCode(),
      getProjection:          () => _project._projection,
      getLayersStore:         () => _project._layersStore,
      getUrl:                 type => _project.urls[type],
    });

    /**
     * Process layerstree and baselayers of the project
     */

    // useful info for catalog
    const traverse = nodes => {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        //check if layer (node) of folder
        if (undefined !== node.id) {
          _project.state.layers
            .forEach(l => {
              if (node.id === l.id) {
                node.name = l.name;
                l.wmsUrl  = _project.state.WMSUrl;
                l.project = _project;
                node[i]   = Object.assign(l, node);
                return false
              }
            });
        }
        if (Array.isArray(node.nodes)) {
          //add title to tree
          node.title = node.name;
          traverse(node.nodes);
        }
      }
    };

    traverse(_project.state.layerstree);

    // Build layersstore 
    _project._layersStore.setOptions({
      id:         _project.state.gid,
      projection: _project._projection,
      extent:     _project.state.extent,
      initextent: _project.state.initextent,
      wmsUrl:     _project.state.WMSUrl,
      catalog:    window.initConfig.overviewproject !== _project.state.gid,
    });

    // instance each layer ad area added to layersstore
    _project.getLayers().forEach(l => {
      const layer = LayerFactory.build(
        Object.assign(l, {
          crs:               crsToCrsObject(l.crs),
          projection:        l.crs ? Projections.get(l.crs) : _project._projection,
          ows_method:        _project.state.ows_method,
          wms_use_layer_ids: _project.state.wms_use_layer_ids,
        }), { project: _project }
      );
      if (layer) {
        _project._layersStore.addLayer(layer)
      }
    });
    
    // create layerstree from layerstore
    _project._layersStore.createLayersTree(_project.state.name, {
      layerstree: _project.state.layerstree,
      expanded:   'not_collapsed' === _project.state.toc_layers_init_status // config to show layerstrees toc expanded or not
    });

    /** @deprecated since 3.10.0. Will be removed in v.4.x. */
    (_project.state.search || []).forEach(s => s.search_endpoint = 'api');

    // add to project
    return _project;
  }

  /** used by the following plugins: "archiweb" */
  setProjectAliasUrl(alias) {
    const project = window.initConfig.projects.find(p => alias.gid === p.gid);
    if (project) {
      project.url = `${alias.host || ''}${alias.url}`
    }
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