import { QUERY_POINT_TOLERANCE }   from 'g3w-constants';
import G3WObject                   from 'g3w-object';
import ApplicationState            from 'store/application';
import Projections                 from 'store/projections';
import { normalizeEpsg }           from 'utils/normalizeEpsg';
import { XHR }                     from 'utils/XHR';
import { getUniqueDomId }          from 'utils/getUniqueDomId';

import { Layer }                   from 'g3w-layer';
import { LayersStore }             from 'map/layers/layersstore';

Object
  .entries({
    Layer,
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

  /**If not defined crs or nno epsg is set (exmaple epsg: 0) return null */
  if ([undefined, null].includes(crs) || (crs && !crs.epsg)) {
    return null;
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

  // { Array } config.layers - The order of layers follows layer rendering order set on QGIS project.Can be different to TOC layer order
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

  const _projection = Projections.get(crsToCrsObject(PROJECTS[gid].crs));

  const project = Object.assign(new G3WObject, {
    setters: {
      setBaseLayer(id) {
        window.initConfig.baselayers.forEach(l => {
          this._layersStore.getLayerById(l.id)?.setVisible(id === l.id);
          l.visible = (id === l.id);
        })
      },
    },
    state: PROJECTS[gid],
    /** project APIs */
    urls: {
      map_themes:          `/${PROJECTS[gid].type}/api/prjtheme/${PROJECTS[gid].id}/`,
      vector_data:         `${PROJECTS[gid].vectorurl}data/${PROJECTS[gid].type}/${PROJECTS[gid].id}/`,
      featurecount:        `${PROJECTS[gid].vectorurl}featurecount/${PROJECTS[gid].type}/${PROJECTS[gid].id}/`,
      editorformstructure: `${PROJECTS[gid].vectorurl}editorformstructure/${PROJECTS[gid].type}/${PROJECTS[gid].id}/`, //@since 4.0.0 get configuration from a specific style for a layer (Ex. featurecount, editor_form_structure, ..)
    },
    _projection:            _projection,
    _layersStore:           new LayersStore({
      id:         PROJECTS[gid].gid,
      projection: _projection,
      extent:     PROJECTS[gid].extent,
      initextent: PROJECTS[gid].initextent,
      wmsUrl:     PROJECTS[gid].WMSUrl,
      catalog:    window.initConfig.overviewproject !== PROJECTS[gid].gid,
    }),
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

  /** ORIGINAL SOURCE: src/app/core/layers/layerfactory.js@v3.10.2 */

  // Layer factory: instance each layer and add to layersstore
  project._layersStore.addLayers(project.getLayers().flatMap(l => {
    const config = Object.assign({}, l, {
      crs:               crsToCrsObject(l.crs || project.state.crs), // @v4.0 Fix In case of missing layer crs, set project crs
      projection:        l.crs ? Projections.get(l.crs) : project._projection,
      ows_method:        project.state.ows_method,
      wms_use_layer_ids: project.state.wms_use_layer_ids,
      //@since v4.0.0 - original config to maintain
      styles:            l.styles && l.styles.map(s => ({...s})), // v4.0.0 pass a copy of styles
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
      return new Layer(config, { project, _TYPE: Layer.LayerTypes.TABLE });
    }

    //@since 4.0.0 no crs exclude from layer list
    if (config.geometrytype && 'NoGeometry' !== config.geometrytype && !config.crs) {
      return [];
    }

    // VECTOR LAYERS
    if (['OGC wfs', 'G3WSUITE geojson'].includes(layerType) || ["Local", "G3WSUITE"].includes(config.servertype))  {
      return new Layer(config, { project, _TYPE: Layer.LayerTypes.VECTOR });
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
      "QGIS arcgisfeatureserver",
    ].includes(layerType)) {
      return new Layer(config, { project, _TYPE: Layer.LayerTypes.IMAGE });
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
      return new Layer(config, { project, _TYPE: Layer.LayerTypes.IMAGE });
    }

    // BASE LAYERS
    if (['OSM', 'Bing', 'TMS', 'ARCGISMAPSERVER', 'WMTS', 'WMS'].includes(config.servertype)) {
      return new Layer(config, { project, _TYPE: Layer.LayerTypes.IMAGE, _BASE_LAYER: config.servertype });
    }

    console.warn('Uknown layer type', config);
    return [];
  }));
  
  // create layerstree
  let layerstree = [];
  if (!project.state.layerstree) {
    // retrieve all project layers that have geometry
    layerstree = project._layersStore.getLayers({ GEOLAYER: true }).map(l => ({
      id:      l.getId(),
      name:    l.getName(),
      title:   l.getTitle(),
      visible: l.isVisible() || false
    }));
  } else {
    const _traverse = (nodes, layerstree, tocLayersId) => {
      nodes.forEach(n => {
        let lightlayer = null;
        // case TOC has layer ID
        if (null !== n.id && undefined !== n.id && tocLayersId.find(id => n.id === id)) {
          lightlayer = ({ ...lightlayer, ...n });
        }
        // case group
        if (null !== n.nodes && undefined !== n.nodes) {
          lightlayer = ({
            ...lightlayer,
            name:                 n.name, /** @since 3.10.0 **/
            title:                n.name,
            groupId:              getUniqueDomId(),
            root:                 false,
            nodes:                [],
            checked:              n.checked,
            mutually_exclusive:   n["mutually-exclusive"],
            'mutually-exclusive': n["mutually-exclusive"], /** @since 3.10.0 */
          });
          _traverse(n.nodes, lightlayer.nodes, tocLayersId); // recursion step
        }
        // check if lightlayer is not null
        if (null !== lightlayer) {
          lightlayer.expanded = n.expanded; // expand legend item (TOC)
          layerstree.push(lightlayer);
        }
      });
    };
    // compare all layer ids from server config with all layer nodes on layerstree server property
    _traverse(
      project.state.layerstree,
      layerstree,
      project._layersStore.getLayers({ BASELAYER: false }).map(l => l.getId())
    );
  }

  // setLayerstree
  if (layerstree.length) {
    const rootGroup = {
      title:       project.state.name || project.state.gid,
      root:        true,
      parentGroup: null,
      expanded:    'not_collapsed' === project.state.toc_layers_init_status,
      disabled:    false,
      checked:     true,
      bbox:        {
        minx: project.state.initextent.at(0),
        miny: project.state.initextent.at(1),
        maxx: project.state.initextent.at(2),
        maxy: project.state.initextent.at(3)
      },
      nodes:       layerstree,
      legendurls:  [],
    };
    const _traverseBBox =(group, { bbox, epsg } = {}) => {
      const project_epsg = project._projection.getCode();

      // translate bbox epsg to project epsg code (when they differ)
      if ((epsg !== project_epsg)) {
        const [minx, miny, maxx, maxy] = ol.proj.transformExtent([ bbox.minx, bbox.miny, bbox.maxx, bbox.maxy ], epsg, project_epsg);
        bbox = { minx, miny, maxx, maxy }
      }
      // get current bbox or compute bbox from an ol extent
      if (undefined === group.bbox) {
        group.bbox = bbox
      } else {
        group.bbox = ol.extent
          .extend(
            [ group.bbox.minx, group.bbox.miny, group.bbox.maxx, group.bbox.maxy ],
            [ bbox.minx, bbox.miny, bbox.maxx, bbox.maxy ]
          )
          .reduce(
            (bbox, extentCoordinate, index) => {
              switch(index){
                case 0: bbox.minx = extentCoordinate; break;
                case 1: bbox.miny = extentCoordinate; break;
                case 2: bbox.maxx = extentCoordinate; break;
                case 3: bbox.maxy = extentCoordinate; break;
              }
              return bbox;
            },
            { minxx:null, miny: null, maxx: null, maxy: null }
          );
      }
      // Recursion
      if (group.parentGroup && false === group.parentGroup.root) {
        _traverseBBox(group.parentGroup, { bbox: group.bbox, epsg: project_epsg });
      }
    };
    const _traverse = (nodes, parentGroup) => {
      nodes.forEach((node, index) => {
        // substitute node layer with layer state
        if (undefined !== node.id) {
          nodes[index] = project._layersStore.getLayerById(node.id).getState();
        }
        // case of layer substitute node with layer state
        if (undefined !== node.id) {
          nodes[index] = project._layersStore.getLayerById(node.id).getState();
          // pass bbox and epsg of layer
          if (nodes[index].bbox) {
            _traverseBBox(parentGroup, { bbox: nodes[index].bbox, epsg: nodes[index].epsg });
          }
        }
        if (Array.isArray(node.nodes)) {
          node.nodes.forEach(n => n.parentGroup = parentGroup);
          _traverse(node.nodes, node);
        }
        //SET PARENT GROUP
        nodes[index].parentGroup = parentGroup;
      });
    }
    _traverse(layerstree, rootGroup);
    project._layersStore.state.layerstree.splice(0, 0, rootGroup); // at the end
  }

  /** @deprecated since 3.10.0. Will be removed in v.4.x. */
  (project.state.search || []).forEach(s => s.search_endpoint = 'api');

  // add to project
  return project;
}