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

const Layer               = require('map/layers/layer');
const TableLayer          = require('map/layers/tablelayer');
const { VectorLayer }     = require('map/layers/vectorlayer');
const { VectorMapLayer }  = require('map/layers/vectorlayer');
const { ImageLayer }      = require('map/layers/imagelayer');
const { WMSLayer }        = require('map/layers/imagelayer');
const LayersStore         = require('map/layers/layersstore');

Object
  .entries({
    Layer,
    TableLayer,
    VectorLayer,
    VectorMapLayer,
    ImageLayer,
    WMSLayer
  })
  .forEach(([k, v]) => console.assert(undefined !== v, `${k} is undefined`));

const WITH_GEOMETRY = [
  Layer.SourceTypes.VIRTUAL,
  Layer.SourceTypes.POSTGIS,
  Layer.SourceTypes.MSSQL,
  Layer.SourceTypes.SPATIALITE,
  Layer.SourceTypes.WFS,
  Layer.SourceTypes.CSV,
  Layer.SourceTypes.ORACLE,
  Layer.SourceTypes.OGR,
  Layer.SourceTypes.MDAL,
];

const NO_GEOMETRY = [
  Layer.SourceTypes.WMST,
  Layer.SourceTypes.WCS,
  Layer.SourceTypes.WMS,
  Layer.SourceTypes.GDAL,
  Layer.SourceTypes.VECTORTILE,
  Layer.SourceTypes["VECTOR-TILE"],
  Layer.SourceTypes.MDAL,
  /** @since 3.8.7 */
  Layer.SourceTypes.ARCGISMAPSERVER,
  /** @since 3.9.0 */
  Layer.SourceTypes.POSTGRESRASTER,
];

const BASE_LAYERS   = {

  /**
   * ORIGINAL SOURCE: src/core/layers/baselayers/osmlayer.js@3.8.6
   */
  [Layer.ServerTypes.OSM]: class extends ImageLayer {
    _makeOlLayer() {
      return new ol.layer.Tile({
        source:  new ol.source.OSM({ url: this.config.url }),
        id:      this.config.name  || 'osm',
        title:   this.config.title || 'OSM',
        basemap: true
      });
    }
  },

  /**
   * ORIGINAL SOURCE: core/layers/baselayers/binglayer.js@3.8.6
   */
  [Layer.ServerTypes.BING]: class extends ImageLayer {
    _makeOlLayer() {
      const name = ({
        streets:          'Road',
        aerial:           'Aerial',
        aerialwithlabels: 'AerialWithLabels'
      })[this.config.source && this.config.source.subtype] || 'Aerial';
      return new ol.layer.Tile({
        name,
        visible: false,
        preload: Infinity,
        source: new ol.source.BingMaps({ imagerySet: name, key: ApplicationState.keys.vendorkeys.bing }),
        basemap: true,
      });
    }
  },

  /**
   * ORIGINAL SOURCE: src/core/layers/baselayers/tmslayer.js@3.8.6
   */
  [Layer.ServerTypes.TMS]: class extends ImageLayer {
    _makeOlLayer() {
      const url        = undefined !== this.config.url ? this.config.url : null;
      const projection = url && this.getProjectionFromCrs(this.config.crs);
      if (!url) {
        return;
      }
      return new ol.layer.Tile({
        visible:    false,
        projection,
        source:     new ol.source.XYZ({
          url,
          maxZoom:     this.config.maxZoom,
          minZoom:     this.config.minZoom,
          projection,
          crossOrigin: 'anonymous',
          // tileLoadFunction:  undefined,
          /** @since 3.10.0 - Map Proxy cache_provider **/
          tileGrid:    'degrees' === projection.getUnits() ? new ol.tilegrid.TileGrid({
            // Need to remove the first resolution because in this version of ol createXYZ doesn't accept maxResolution options.
            // The extent of EPSG:4326 is not squared [-180, -90, 180, 90] as EPSG:3857 so the resolution is calculated
            // by Math.max(width(extent)/tileSize,Height(extent)/tileSize)
            // we need to calculate to Math.min instead, so we have to remove the first resolution
            resolutions: ol.tilegrid.createXYZ({ extent: projection.getExtent(), maxZoom: this.config.maxZoom }).getResolutions().slice(1),
            extent:      projection.getExtent(),
          }) : undefined,
        })
      });
    }
  },

  /**
   * ORIGINAL SOURCE: src/app/core/layers/baselayers/arcgislayer.js@3.8.6
   */
  [Layer.ServerTypes.ARCGISMAPSERVER]: class extends ImageLayer {
    _makeOlLayer() {
      return new ol.layer.Tile({
        // extent: opts.extent,
        visible: false,
        source: new ol.source.TileArcGISRest({
          url:          undefined === this.config.url ? null : this.config.url,
          projection:   this.getProjectionFromCrs(this.config.crs),
          attributions: this.config.attributions,
          // crossOrigin:  opts.crossOrigin,
        }),
      });
    }
  },

  /**
   * ORIGINAL SOURCE: src/app/core/layers/baselayers/wmtslayer.js@3.8.6
   */
  [Layer.ServerTypes.WMTS]: class extends ImageLayer {
    _makeOlLayer() {
      // use this config to get params
      const {
        url,
        layer,
        attributions,
        matrixSet,
        format = 'image/png',
        style  = 'default',
        requestEncoding,
        grid, /** @since 3.10.0*/
        grid_extent, /** @since 3.10.0 */
      } = this.config;

      /** @since 3.10.0 */
      let projection = this.config.projection || this.getProjectionFromCrs(this.config.crs);

      if (matrixSet) {
        const size = ol.extent.getWidth(projection.getExtent()) / 256;
        return new ol.layer.Tile({
          opacity: .7,
          source: new ol.source.WMTS({
            url,
            projection,
            layer,
            matrixSet,
            requestEncoding,
            format,
            attributions,
            tileGrid: new ol.tilegrid.WMTS({
              origin:      ol.extent.getTopLeft(projection.getExtent()),
              resolutions: Array.from({ length: 14 }, (_, z) => size / Math.pow(2, z)),
              matrixIds:   Array.from({ length: 14 }, (_, z) => z),
            }),
            style
          })
        });
      }

      /** @since 3.10.0 WMTS based on mapproxy*/
      if (grid && grid_extent) {
        const resolutions = ol.tilegrid.createXYZ({ extent: grid_extent }).getResolutions();
        return new ol.layer.Tile({
          source: new ol.source.WMTS({
            url,
            layer,
            projection,
            matrixSet: grid,
            format:    format || 'png',
            tileGrid:  new ol.tilegrid.WMTS({
                         origin: ol.extent.getTopLeft(grid_extent),
                         resolutions,
                         matrixIds: resolutions.map((_, z) => z),
                       }),
            style,
            transparent: false,
          })
        });
      }

    }
  },

  /**
   * ORIGINAL SOURCE: src/appcore/layers/baselayers/wmslayer.js@3.8.6
   */
  [Layer.ServerTypes.WMS]: class extends ImageLayer {
    _makeOlLayer() {
      return WMSLayer._makeOlLayer({
        layerObj: {
          url:          this.config.url,
          projection:   this.getProjectionFromCrs(this.config.crs),
          attributions: this.config.attributions,
          layers:       this.config.layers,
          tiled:        undefined === this.config.singleTile ? false : this.config.singleTile,
          opacity:      undefined === this.config.opacity ? 1 : this.config.opacity,
        },
    });
    }
  },

};


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
  if (crs && crs.epsg) {
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

    /** ORIGINAL SOURCE: src/app/core/layers/layerfactory.js@v3.10.2 */

    // Layer factory: instance each layer and add to layersstore
    _project.getLayers().map(l => {
      const config = Object.assign(l, {
        crs:               crsToCrsObject(l.crs),
        projection:        l.crs ? Projections.get(l.crs) : _project._projection,
        ows_method:        _project.state.ows_method,
        wms_use_layer_ids: _project.state.wms_use_layer_ids,
      });
    
      const options = { project: _project };

      if (!config.servertype) {
        console.warn('Undefined layer server type');
        return;
      }

      // Get Source
      const source = config.source || {};

      // Check Server Type
      const is_qgis     = Layer.ServerTypes.QGIS                       === config.servertype;
      const is_ogc      = Layer.ServerTypes.OGC                        === config.servertype;
      const is_g3w      = Layer.ServerTypes.G3WSUITE                   === config.servertype
      const is_local    = Layer.ServerTypes.LOCAL                      === config.servertype;

      const is_wms      = is_ogc  && Layer.SourceTypes.WMS             === source.type;
      const is_wfs      = is_ogc  && Layer.SourceTypes.WFS             === source.type;
      const is_geojson  = is_g3w  && Layer.SourceTypes.GEOJSON         === source.type;
      const is_pgraster = is_qgis && Layer.SourceTypes.POSTGRESRASTER  === source.type;

      // Check Geometry Type
      const is_tabular = 'NoGeometry' === config.geometrytype;
      const has_geom   = config.geometrytype && WITH_GEOMETRY.includes(source.type);
      const no_geom    = !config.geometrytype && NO_GEOMETRY.includes(source.type);

      // Check Layer Type
      const is_base_layer    = config.servertype in BASE_LAYERS;
      const is_table_layer   = is_qgis && has_geom && is_tabular;
      const is_image_layer   = is_wms || is_qgis && (no_geom || (has_geom && !is_tabular) || is_pgraster);
      const is_vector_layer  = is_local || is_wfs || (is_g3w && !is_geojson);
      const is_geojson_layer = is_geojson;

      /**
       * TABLE LAYERS
       */
      if (is_table_layer)   return new TableLayer(config, options);

      /**
       * RASTER LAYERS
       */
      if (is_image_layer)   return new ImageLayer(config, options);
      if (is_base_layer)    return new BASE_LAYERS[config.servertype](config, options);

      /**
       * VECTOR LAYERS
       */
      if (is_vector_layer)  {
        return new VectorLayer(config, options);
      }

      /**
       * GEOJSON LAYER
       * 
       * ORIGINAL SOURCE: src/app/core/layers/map/geojson.js@v3.10.1
       * ORIGINAL SOURCE: src/app/core/layers/geojson.js@v3.10.1
       */
      if (is_geojson_layer) {
        const geojson = new VectorLayer(config, options);
        geojson.config.style = config.style;
        geojson.getMapLayer  = function() {
          if (!this._mapLayer) {
            this._mapLayer = new VectorMapLayer({
              url:        this.get('source').url,
              projection: this.getProjection().getCode(),
              id:         this.getId(),
              name:       this.getName(),
              style:      this.get('style'),
              provider:   this.getProvider('data')
            });
            this._mapLayer.getFeatures({
              url:           this.get('source').url,
              mapProjection: this._mapLayer.mapProjection 
            });
          }
          return this._mapLayer;
        };
        geojson.setup(config);
        return geojson;
      }

      console.warn('Uknown layer server type', config);

    }).forEach(layer => {
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