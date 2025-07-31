/**
 * @file
 * 
 * ORIGINAL SOURCE: src/map/controls/scalecontrol.js@v3.11.10
 * ORIGINAL SOURCE: src/utils/getProject.js@v4.0.0
 * ORIGINAL SOURCE: src/map/layers/layersstore.js@v4.0.0
 * 
 * @since 4.0.0
 */

import GUI                       from 'services/gui';
import { Layer }                 from 'g3w-layer';

import ApplicationState          from 'g3w-state';
import { normalizeEpsg }         from 'utils/normalizeEpsg';
import { XHR }                   from 'utils/XHR';
import { getUniqueDomId }        from 'utils/getUniqueDomId';

Object
  .entries({
    Layer,
  })
  .forEach(([k, v]) => console.assert(undefined !== v, `${k} is undefined`));

// wait for map ready
GUI.once('ready', async () => {
  const map = GUI.getService('map');
  map.setupControl.overview = async function() {
    if (isMobile.any) {
      return;
    }
    try {
      const gid    = window.initConfig.overviewproject;
      const CONFIG = window.initConfig.projects.find(p => gid === p.gid);
      let PROJECT  = gid === g3wsdk.core.ApplicationState.project.getGid() ? g3wsdk.core.ApplicationState.project : null;

      if (!CONFIG) {
        throw `Project doesn't exist ${gid}`;
      }

      // fetch project configuration from remote server
      if (!PROJECT) {
        PROJECT = Object.assign({}, CONFIG, await XHR.get({ url:
          `${window.initConfig.urls.baseurl}${window.initConfig.urls.config}/${window.initConfig.id}/${CONFIG.type}/${CONFIG.id}?_t=${CONFIG.modified}`
        }), {
          _layers: {},
          _layerstree: [],
          get crs()      { return normalizeEpsg(CONFIG.crs, false) },
          getType:       () => CONFIG.type,
          getId:         () => CONFIG.id,
          getProjection: () => ApplicationState.projections.get(PROJECT.crs),
          getRelations() { return []; }
        });

        // loop layerstree and inject additional layer properties from server config (eg. visibile: true/false)
        const traverse = nodes => {
          nodes.forEach((node, i) => {
            if (undefined !== node.id) {
              PROJECT.layers.forEach(l => {
                if (node.id === l.id) {
                  node[i] = Object.assign(l, node);
                }
              });
            }
            if (Array.isArray(node.nodes)) {
              traverse(node.nodes);
            }
          });
        };
        traverse(PROJECT.layerstree);

        // Layer factory: instance each layer and add to layersstore
        PROJECT.layers.flatMap(l => {

          l.wmsUrl = `${window.initConfig.urls.baseurl}${window.initConfig.urls.ows}/${window.initConfig.id}/${CONFIG.type}/${CONFIG.id}/`;

          const config = Object.assign({}, l, {
            crs:               normalizeEpsg(l.crs || PROJECT.crs, false), // @v4.0 Fix In case of missing layer crs, set project crs
            projection:        l.crs ? ApplicationState.projections.get(l.crs) : PROJECT.getProjection(),
            ows_method:        PROJECT.ows_method || 'GET',
            wms_use_layer_ids: PROJECT.wms_use_layer_ids,
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
            return new Layer(config, { project: PROJECT, _TYPE: 'table' });
          }

          //@since 4.0.0 no crs exclude from layer list
          if (config.geometrytype && 'NoGeometry' !== config.geometrytype && !config.crs) {
            return [];
          }

          // VECTOR LAYERS
          if (['OGC wfs', 'G3WSUITE geojson'].includes(layerType) || ["Local", "G3WSUITE"].includes(config.servertype))  {
            return new Layer(config, { project: PROJECT, _TYPE: 'vector' });
          }

          // RASTER LAYERS
          if ((
              config.geometrytype && 'NoGeometry' !== config.geometrytype && [
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
            ].includes(layerType)
          ) || (
            !config.geometrytype && [
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
            ].includes(layerType)
          )) {
            return new Layer(config, { project: PROJECT, _TYPE: 'image' });
          }

          // BASE LAYERS
          if (['TMS', 'ARCGISMAPSERVER', 'WMTS', 'WMS'].includes(config.servertype)) {
            return new Layer(config, { project: PROJECT, _TYPE: 'image', _BASE_LAYER: config.servertype });
          }

          console.info('Invalid layer', config);
          return [];
        }).forEach(l => PROJECT._layers[l.getId()] = l);
        
        // create layerstree
        let layerstree = [];
        if (!PROJECT.layerstree) {
          // retrieve all project layers that have geometry
          layerstree = Object.values(PROJECT._layers).filter(l => l.isGeoLayer()).map(l => ({
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
            PROJECT.layerstree,
            layerstree,
            Object.values(PROJECT._layers).filter(l => !l.isBaseLayer()).map(l => l.getId())
          );
        }

        // setLayerstree
        if (layerstree.length) {
          const rootGroup = {
            title:       PROJECT.name || PROJECT.gid,
            root:        true,
            parentGroup: null,
            expanded:    'not_collapsed' === PROJECT.toc_layers_init_status,
            disabled:    false,
            checked:     true,
            bbox:        {
              minx: PROJECT.initextent.at(0),
              miny: PROJECT.initextent.at(1),
              maxx: PROJECT.initextent.at(2),
              maxy: PROJECT.initextent.at(3)
            },
            nodes:       layerstree,
            legendurls:  [],
          };
          const _traverseBBox =(group, { bbox, epsg } = {}) => {
            // translate bbox epsg to project epsg code (when they differ)
            if ((epsg !== PROJECT.getProjection().getCode())) {
              const [minx, miny, maxx, maxy] = ol.proj.transformExtent([ bbox.minx, bbox.miny, bbox.maxx, bbox.maxy ], epsg, PROJECT.getProjection().getCode());
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
              _traverseBBox(group.parentGroup, { bbox: group.bbox, epsg: PROJECT.getProjection().getCode() });
            }
          };
          const _traverse = (nodes, parentGroup) => {
            nodes.forEach((node, index) => {
              // substitute node layer with layer state
              if (undefined !== node.id) {
                nodes[index] = PROJECT._layers[node.id].getState();
              }
              // case of layer substitute node with layer state
              if (undefined !== node.id) {
                nodes[index] = PROJECT._layers[node.id].getState();
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
          PROJECT._layerstree.splice(0, 0, rootGroup); // at the end
        }

      }

      // BACKOMP v3.x
      if (!PROJECT.state) {
        Object.defineProperty(PROJECT, 'state', { get() { return PROJECT; }, configurable: false, enumerable: true });
      }

      map.createMapControl({
        id: 'overview',
        add: false,
        options: {
          ol: new ol.control.OverviewMap({
            view:          new ol.View({
              extent:        PROJECT.state.extent,
              projection:    map.getProjection(),
              center:        ol.extent.getCenter(PROJECT.state.initextent),
              maxResolution: Math.max(ol.extent.getWidth(PROJECT.state.extent) / 200,     ol.extent.getHeight(PROJECT.state.extent) / 150),     // max(xRes, yRes)
              resolution:    Math.max(ol.extent.getWidth(PROJECT.state.initextent) / 200, ol.extent.getHeight(PROJECT.state.initextent) / 150), // max(xInitRes, yInitRes)
            }), // hardcoded
            collapsed:     false,
            className:     'ol-overviewmap ol-custom-overviewmap',
            collapseLabel: $(`<span class="${GUI.getFontClass('arrow-left')}"></span>`)[0],
            label:         $(`<span class="${GUI.getFontClass('arrow-right')}"></span>`)[0],
            layers:        Object
              .entries(
                // group layer by multilayerId
                Object
                  .values(PROJECT._layers)
                  .filter(l => l.isGeoLayer() && !l.isBaseLayer())
                  .reduce((group, l) => {
                    const id = l.getMultiLayerId();
                    group[id] = group[id] || [];
                    group[id].push(l);
                    return group;
                  }, {}) || []
              ).map(([id, layers]) => {
                const layer = new Layer({
                  url:   `${window.initConfig.urls.baseurl}${window.initConfig.urls.ows}/${window.initConfig.id}/${CONFIG.type}/${CONFIG.id}/`,
                  id:    `overview_layer_${id}`,
                  tiled: layers[0].state.tiled,
                },
                { _RASTER_LAYER: true });
                layers.reverse().forEach(l => layer.addLayer(l));
                return layer.getOLLayer(true);
              }).reverse()
          }),
          position: 'bl',
        }
      })
      /** @since 3.10.0 Move another bottom left map controls bottom to a left of overview control**/
      document.querySelector('.g3w-map-controls-left-bottom').style.left = '230px';
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if ("class" === mutation.attributeName) {
            document.querySelector('.g3w-map-controls-left-bottom').style.left = mutation.target.classList.contains('ol-collapsed') ? '50px' : '230px';
          }
        });
      });
      observer.observe(document.querySelector('.ol-custom-overviewmap'), { attributes: true });
    } catch (err) {
      console.warn(err)
    }
  }
});