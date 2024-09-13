import { QUERY_POINT_TOLERANCE }   from 'g3w-constants';
import G3WObject                   from 'g3w-object';
import ApplicationState            from 'store/application-state';
import Projections                 from 'store/projections';
import { normalizeEpsg }           from 'utils/normalizeEpsg';
import { XHR }                     from 'utils/XHR';

const TableLayer          = require('map/layers/tablelayer');
const VectorLayer         = require('map/layers/vectorlayer');
const { ImageLayer }      = require('map/layers/imagelayer');
const LayersStore         = require('map/layers/layersstore');

Object
  .entries({
    TableLayer,
    VectorLayer,
    ImageLayer,
  })
  .forEach(([k, v]) => console.assert(undefined !== v, `${k} is undefined`));

// (lazy loading)
const PROJECTS = {};

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

/**
 * ORIGINAL SOURCE: src/app/core/project/project.js@v3.10.2
 * 
 * Get project configuration
 *
 * @param { string } gid project gid
 * @param options
 * @param { string } options.map_theme
 */
export async function getProject(gid, options = {}) {

  const pendingProject = window.initConfig.projects.find(p => gid === p.gid);

  // skip if a project doesn't exist
  if (!pendingProject) {
    console.log("Project doesn't exist", gid)
    return Promise.reject("Project doesn't exist");
  }

  // fetch project configuration from remote server
  const config    = !PROJECTS[gid] && await XHR.get({ url:
    `${window.initConfig.urls.baseurl}${window.initConfig.urls.config}/${window.initConfig.id}/${pendingProject.type}/${pendingProject.id}?_t=${pendingProject.modified}`
  });
  const map_theme = config && options.map_theme && Object.values(config.map_themes).flat().find(({ theme }) => theme === options.map_theme);

  /** In the case of url param set map_theme, need to get map theme configuration from server */
  if (map_theme) {
    const { result, data } = await XHR.get({url: `/${pendingProject.type}/api/prjtheme/${pendingProject.id}/${options.map_theme}` });
    if (result) {
      config.layerstree    = data;
      map_theme.layetstree = data;
      map_theme.default    = true;
    }
  }

  PROJECTS[gid] = Object.assign(PROJECTS[gid] || {}, Object.assign(pendingProject, config));
  PROJECTS[gid] = Object.assign(PROJECTS[gid], {
    WMSUrl: `${window.initConfig.urls.baseurl}${window.initConfig.urls.ows}/${window.initConfig.id}/${PROJECTS[gid].type}/${PROJECTS[gid].id}/`,
    /** @since 3.8.0 */
    relations: (PROJECTS[gid].relations || []).map(r => {
      if ("ONE" === r.type) {
        PROJECTS[gid].layers.find(l => {
          if (l.id === r.referencingLayer) {
            r.name     = l.name;
            r.origname = l.origname;
            return true;
          }
        });
      }
      return r;
    }),
    /** actived catalog tab */
    catalog_tab:            PROJECTS[gid].toc_tab_default        || PROJECTS[gid]._catalog_tab || 'layers',
    ows_method:             PROJECTS[gid].ows_method             || 'GET',
    toc_layers_init_status: PROJECTS[gid].toc_layers_init_status || 'not_collapsed',
    toc_themes_init_status: PROJECTS[gid].toc_themes_init_status || 'collapsed',
    query_point_tolerance:  PROJECTS[gid].query_point_tolerance  || QUERY_POINT_TOLERANCE,
    crs:                    crsToCrsObject(PROJECTS[gid].crs),
    baselayers:             PROJECTS[gid].baselayers
      // Remove bing base layer when no vendor API Key is provided
      .filter(l => ('Bing' === l.servertype ? ApplicationState.keys.vendorkeys.bing : true))
      .map(l => Object.assign(l, {
        visible:   l.id && (l.id === (null !== ApplicationState.baseLayerId ? ApplicationState.baseLayerId : PROJECTS[gid].initbaselayer)) || !!l.fixed,
        baselayer: true,
      })),
  });

  const project = Object.assign(new G3WObject, {
    setters: {
      setBaseLayer(id) {
        window.initConfig.baselayers.forEach(l => {
          this._layersStore.getLayerById(l.id).setVisible(id === l.id);
          l.visible = (id === l.id);
        })
      },
    },
    state: PROJECTS[gid],
    /** project APIs */
    urls: {
      map_themes:      `/${PROJECTS[gid].type}/api/prjtheme/${PROJECTS[gid].id}/`,
      vector_data:     `${PROJECTS[gid].vectorurl}data/${PROJECTS[gid].type}/${PROJECTS[gid].id}/`,
      featurecount:    `${PROJECTS[gid].vectorurl}featurecount/${PROJECTS[gid].type}/${PROJECTS[gid].id}/`,
    },
    _projection:            Projections.get(crsToCrsObject(PROJECTS[gid].crs)),
    _layersStore:           new LayersStore(),
    getQueryPointTolerance: () => project.state.query_point_tolerance,
    getRelations:           () => project.state.relations,
    getRelationById:        id => project.state.relations.find(r => id === r.id),
    getLayerById:           id => project._layersStore.getLayerById(id),
    getLayers:              () => [...project.state.layers, ...project.state.baselayers],
    getState:               () => project.state,
    getPrint:               () => project.state.print || [],
    getId:                  () => project.state.id,
    getType:                () => project.state.type,
    getGid:                 () => project.state.gid,
    getName:                () => project.state.name,
    getCrs:                 () => project._projection.getCode(),
    getProjection:          () => project._projection,
    getLayersStore:         () => project._layersStore,
    getUrl:                 type => project.urls[type],
    /**
     * @param filter property layer config to filter
     * 
     * @returns { Array } configuration layers (from server config)
     */
    getConfigLayers:        ({ key } = {}) => key ? project.state.layers.filter(l => undefined !== l[key] ) : project.state.layers,
  });

  // Process layerstree and baselayers of the project (useful info for catalog)
  const traverse = nodes => {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      //check if layer (node) of folder
      if (undefined !== node.id) {
        project.state.layers
          .forEach(l => {
            if (node.id === l.id) {
              node.name = l.name;
              l.wmsUrl  = project.state.WMSUrl;
              l.project = project;
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

  traverse(project.state.layerstree);

  // Build layersstore 
  project._layersStore.setOptions({
    id:         project.state.gid,
    projection: project._projection,
    extent:     project.state.extent,
    initextent: project.state.initextent,
    wmsUrl:     project.state.WMSUrl,
    catalog:    window.initConfig.overviewproject !== project.state.gid,
  });

  /** ORIGINAL SOURCE: src/app/core/layers/layerfactory.js@v3.10.2 */

  // Layer factory: instance each layer and add to layersstore
  project._layersStore.addLayers(project.getLayers().flatMap(l => {
    const config = Object.assign(l, {
      crs:               crsToCrsObject(l.crs),
      projection:        l.crs ? Projections.get(l.crs) : project._projection,
      ows_method:        project.state.ows_method,
      wms_use_layer_ids: project.state.wms_use_layer_ids,
    });

    // Check Layer Type
    const layerType = `${config.servertype} ${config.source && config.source.type}`;

    // TABLE LAYERS
    if ('NoGeometry' === config.geometrytype && [
      "QGIS virtual",
      "QGIS postgres",
      "QGIS mssql",
      "QGIS spatialite",
      "QGIS wfs",
      "QGIS delimitedtext",
      "QGIS oracle",
      "QGIS ogr",
      "QGIS mdal",
    ].includes(layerType)) {
      return new TableLayer(config, { project });
    }

    // VECTOR LAYERS
    if (['OGC wfs', 'G3WSUITE geojson'].includes(layerType) || ["Local", "G3WSUITE"].includes(config.servertype))  {
      return new VectorLayer(config, { project });
    }

    // RASTER LAYERS
    if (config.geometrytype && 'NoGeometry' !== config.geometrytype && [
      'OGC wms',
      'QGIS postgresraster',
      "QGIS virtual",
      "QGIS postgres",
      "QGIS mssql",
      "QGIS spatialite",
      "QGIS wfs",
      "QGIS delimitedtext",
      "QGIS oracle",
      "QGIS ogr",
      "QGIS mdal",
    ].includes(layerType)) {
      return new ImageLayer(config, { project });
    }

    // RASTER LAYERS
    if (!config.geometrytype && [
      'OGC wms',
      'QGIS postgresraster',
      "QGIS wmst",
      "QGIS wcs",
      "QGIS wms",
      "QGIS gdal",
      "QGIS vectortile",
      "QGIS vector-tile",
      "QGIS mdal",
      "QGIS arcgismapserver",
    ].includes(layerType)) {
      return new ImageLayer(config, { project });
    }

    // BASE LAYERS
    if (['OSM', 'Bing', 'TMS', 'ARCGISMAPSERVER', 'WMTS', 'WMS'].includes(config.servertype)) {
      return new ImageLayer(config, { project, _BASE_LAYER: config.servertype });
    }

    console.warn('Uknown layer type', config);
    return [];
  }));
  
  // create layerstree from layerstore
  project._layersStore.createLayersTree(project.state.name, {
    layerstree: project.state.layerstree,
    expanded:   'not_collapsed' === project.state.toc_layers_init_status // config to show layerstrees toc expanded or not
  });

  /** @deprecated since 3.10.0. Will be removed in v.4.x. */
  (project.state.search || []).forEach(s => s.search_endpoint = 'api');

  // add to project
  return project;
}