import { MAP_SETTINGS } from 'constant';
import { t } from 'core/i18n/i18n.service';
import WMSLayer from 'core/layers/map/wmslayer';
import utils from 'core/utils/utils';
import G3WObject from 'core/g3wobject';
import geoutils from 'core/utils/geo';
import DataRouterService from 'core/data/routerservice';
import GUI from 'gui/gui';
import ApplicationService from 'core/applicationservice';
import ProjectsRegistry from 'core/project/projectsregistry';
import MapLayersStoreRegistry from 'core/map/maplayersstoresregistry';
import WFSProvider from 'core/layers/providers/wfsprovider';
import MapHelper from 'g3w-ol/map/maphelpers';
import g3wolutils from 'g3w-ol/utils/utils';
import ControlsFactory from 'gui/map/control/factory';
import StreetViewService from 'gui/streetview/streetviewservice';
import ControlsRegistry from 'gui/map/control/registry';
import VectorLayer from 'core/layers/vectorlayer';
import { Overlay, View } from 'ol';
import { Vector as OLVectorLayer, Image as ImageLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import Feature from 'ol/Feature';
import { unByKey } from 'ol/Observable';
import geom, {
  Point, Polygon, MultiPolygon, Geometry,
} from 'ol/geom';
import { transform, transformExtent, get } from 'ol/proj';
import {
  getCenter, containsExtent, getWidth, getHeight, extend,
} from 'ol/extent';
import { Attribution } from 'ol/control';
import { format, createStringXY } from 'ol/coordinate';
import {
  Style, Stroke, Fill, Circle,
} from 'ol/style';
import { Pointer } from 'ol/interaction';
import { GeoJSON } from 'ol/format';
import { DEVICE_PIXEL_RATIO } from 'ol/has';
import wms from 'gui/wms/vue/wms';

const SETTINGS = {
  zoom: {
    maxScale: 1000,
  },
  animation: {
    duration: 2000,
  },
};
let animatingHighlight = false;

class MapService extends G3WObject {
  constructor(options = {}) {
    super({
      setters: {
        setupControls() {
          return this._setupControls();
        },
        addHideMap({
          ratio, layers = [], mainview = false, switchable = false,
        } = {}) {
          const id = `hidemap_${Date.now()}`;
          const idMap = {
            id,
            map: null,
            switchable,
          };
          this.state.hidemaps.push(idMap);
          return idMap;
        },
        updateMapView(bbox, resolution, center) {
          this.state.bbox = bbox;
          this.state.resolution = resolution;
          this.state.center = center;
          this.updateMapLayers();
        },
        setHidden(bool) {
          this.state.hidden = bool;
        },
        setupViewer(width, height) {
          if (width === 0 || height === 0) return;
          if (this.viewer) {
            this.viewer.destroy();
            this.viewer = null;
          }
          this._setupViewer(width, height);
          this.state.bbox = this.viewer.getBBOX();
          this.state.resolution = this.viewer.getResolution();
          this.state.center = this.viewer.getCenter();
          this._setupAllLayers();
          this.setUpMapOlEvents();
          this.fire('viewerset');
        },
        controlClick(mapcontrol, info = {}) {},
        loadExternalLayer(layer) {}, // used in general to alert exteexternal layer is  load
        unloadExternalLayer(layer) {},
      },
      debounces: {
        setupCustomMapParamsToLegendUrl: {
          fnc: (...args) => {
            this._setupCustomMapParamsToLegendUrl(...args);
          },
          delay: 1000,
        },
      },
    });

    this.state = {
      mapUnits: 'm',
      bbox: [],
      hidemaps: [],
      resolution: null,
      center: null,
      loading: false,
      hidden: true,
      scale: 0,
      mapcontrolsalignement: 'rv',
      mapcontrolDOM: null,
      mapcontrolready: false,
      mapcontrolSizes: {
        height: 47,
        width: 47,
        minWidth: 47,
        minHeight: 47,
      },
      mapControl: {
        grid: [],
        length: 0,
        currentIndex: 0,
        update: true,
        disabled: false,
      },
      map_info: {
        info: null,
        style: null,
      },
      mapunits: ['metric'],
    };
    this.id = 'MapService';
    this.viewer = null;
    this.target = options.target || null;
    this.layersCount = 0; // useful to set Zindex to layer order on map
    this.maps_container = options.maps_container || null;
    this._layersStoresEventKeys = {};
    this._keyEvents = {
      ol: [],
      g3wobject: [],
      eventemitter: [],
    };
    this.project = null;
    this._mapControls = [];
    this._changeMapMapControls = [];
    this._mapLayers = [];
    this._externalMapLayers = [];
    this._externalLayers = [];
    // array where store interactions added from plugin or extenal from application
    this._externalInteractions = [];
    this.mapBaseLayers = {};
    this.defaultsLayers = {
      _style: {
        highlightLayer: {
          color: undefined,
        },
        selectionLayer: {
          color: 'red',
        },
      },
      highlightLayer: new OLVectorLayer({
        source: new VectorSource(),
        style: (feature) => {
          const styles = [];
          const geometryType = feature.getGeometry().getType();
          const style = geoutils.createSelectedStyle({
            geometryType,
            color: this.defaultsLayers._style.highlightLayer.color,
            fill: false,
          });
          styles.push(style);
          return styles;
        },
      }),
      selectionLayer: new OLVectorLayer({
        source: new VectorSource(),
        style: (feature) => {
          const styles = [];
          const geometryType = feature.getGeometry().getType();
          const style = geoutils.createSelectedStyle({
            geometryType,
            color: this.defaultsLayers._style.selectionLayer.color,
            fill: false,
          });
          styles.push(style);
          return styles;
        },
      }),
    };
    this.layersExtraParams = {};
    this._greyListenerKey = null;
    this._drawShadow = {
      type: 'coordinate',
      outer: [],
      inner: [],
      scale: null,
      rotation: null,
    };
    this.config = options.config || ApplicationService.getConfig();
    this._howManyAreLoading = 0;
    this._layersLoadingError = false;
    // function to show spinner layers
    this._incrementLoaders = () => {
      if (this._howManyAreLoading === 0) {
        this.fire('loadstart');
        GUI.showSpinner({
          container: $('#map-spinner'),
          id: 'maploadspinner',
          style: 'transparent',
        });
      }
      this._howManyAreLoading += 1;
    };

    this._decrementLoaders = () => {
      this._howManyAreLoading -= 1;
      if (this._howManyAreLoading === 0) {
        this.fire('loadend');
        GUI.hideSpinner('maploadspinner');
      }
    };

    this._mapLayerLoadError = () => {
      if (!this._layersLoadingError) {
        GUI.notify.warning('sdk.errors.layers.load');
        this._layersLoadingError = true;
      }
      this._decrementLoaders();
    };
    if (options.project) this.project = options.project;
    else {
      this.project = ProjectsRegistry.getCurrentProject();
      // on after setting current project
      const keysetCurrentProject = ProjectsRegistry.onafter('setCurrentProject', (project) => {
        this.removeLayers();
        this._removeListeners();
        // check if reload same project
        const isSameProject = this.project.getId() === project.getId();
        this.project = project;
        const changeProjectCallBack = () => {
          this._resetView();
          this._setupAllLayers();
          this._checkMapControls();
          this.setUpMapOlEvents();
          this.setupCustomMapParamsToLegendUrl();
        };
        ApplicationService.isIframe() && changeProjectCallBack();
        isSameProject ? changeProjectCallBack() : this.getMap().once('change:size', changeProjectCallBack);
      });
      this._keyEvents.g3wobject.push({
        who: ProjectsRegistry,
        setter: 'setCurrentProject',
        key: keysetCurrentProject,
      });
    }
    this._setupListeners();
    this._marker = null;
    this._bboxLayer = new OLVectorLayer({
      source: new VectorSource({}),
    });

    this._onCatalogSelectLayer = function (layer) {
      if (layer) {
        for (let i = 0; i < this._mapControls.length; i++) {
          const mapcontrol = this._mapControls[i];
          // is a function
          if (mapcontrol.control.onSelectLayer) mapcontrol.control.onSelectLayer(layer);
        }
      }
    };

    this.on('cataloglayerselected', this._onCatalogSelectLayer);

    this._keyEvents.eventemitter.push({
      event: 'cataloglayerselected',
      listener: this._onCatalogSelectLayer,
    });

    const extraParamsSet = (extraParams, update) => {
      update && this.getMapLayers().forEach((mapLayer) => mapLayer.update(this.state, extraParams));
    };

    this.on('extraParamsSet', extraParamsSet);

    this._keyEvents.eventemitter.push({
      event: 'extraParamsSet',
      listener: extraParamsSet,
    });

    this.once('viewerset', () => {
      // CHECK IF MAPLAYESRSTOREREGISTRY HAS LAYERSTORE
      MapLayersStoreRegistry.getLayersStores().forEach((layersStore) => {
        this._setUpEventsKeysToLayersStore(layersStore);
      });
      // LISTEN ON EVERY ADDED LAYERSSTORE
      MapLayersStoreRegistry.onafter('addLayersStore', (layersStore) => {
        this._setUpEventsKeysToLayersStore(layersStore);
      });
      // LISTENER ON REMOVE LAYERSTORE
      MapLayersStoreRegistry.onafter('removeLayersStore', (layerStore) => {
        this._removeEventsKeysToLayersStore(layerStore);
      });
    });
  }

  setUpMapOlEvents() {
    const dynamicLegend = this.project.getContextBaseLegend();
    // set change resolution
    this._keyEvents.ol.forEach((keyEvent) => unByKey(keyEvent));
    const keyolchangeresolution = this.viewer.map.getView().on('change:resolution', (evt) => {
      this._updateMapView();
      dynamicLegend && this.setupCustomMapParamsToLegendUrl();
    });
    this._keyEvents.ol.push(keyolchangeresolution);
    if (dynamicLegend) {
      const keyolmoveeend = this.viewer.map.on('moveend', (evt) => this.setupCustomMapParamsToLegendUrl());
      this._keyEvents.ol.push(keyolmoveeend);
    } else this.setupCustomMapParamsToLegendUrl(false);
  }

  // clear methods to remove all listeners events
  clear() {
    Object.keys(this._keyEvents).forEach((type) => {
      switch (type) {
        case 'ol':
          this._keyEvents[type].forEach((keyEvent) => unByKey(keyEvent));
          break;
        case 'g3wobject':
          this._keyEvents[type].forEach((eventObject) => {
            const { who, setter, key } = eventObject;
            who.un(setter, key);
          });
          break;
        case 'eventemitter':
          this._keyEvents[type].forEach((eventObject) => {
            const { event, listener } = eventObject;
            this.removeListener(event, listener);
          });
          break;
      }
    });
    this._keyEvents = null;
    MapLayersStoreRegistry.getLayersStores().forEach((layerStore) => {
      this._removeEventsKeysToLayersStore(layerStore);
    });
  }

  showMapSpinner() {
    GUI.showSpinner({
      container: $('#map-spinner'),
      id: 'maploadspinner',
      style: 'transparent',
    });
  }

  hideMapSpinner() {
    GUI.hideSpinner('maploadspinner');
  }

  getScaleFromExtent(extent) {
    const resolution = this.getMap().getView().getResolutionForExtent(extent, this.getMap().getSize());
    const scale = g3wolutils.getScaleFromResolution(resolution, this.getMapUnits());
    return scale;
  }

  _addHideMap({ ratio, layers = [], mainview = false } = {}) {
    const idMap = this.state.hidemaps[this.state.hidemaps.length - 1];
    const view = this.getMap().getView();
    const view_options = {
      projection: view.getProjection(),
      center: view.getCenter(),
      resolution: this.getResolution(),
    };
    const viewer = MapHelper.createViewer({
      id: idMap.id,
      view: mainview ? view : view_options,
    });
    // set Map
    idMap.map = viewer.getMap();
    // in case of rate
    if (ratio) {
      const [width, height] = idMap.map.getSize();
      idMap.map.setSize([width, width * ratio]);
    }

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      idMap.map.addLayer(layer);
    }
    return idMap.map;
  }

  removeHideMap(id) {
    let index;
    for (let i = 0; i < this.state.hidemaps.length; i++) {
      if (id === this.state.hidemaps[i].id) {
        index = i;
        break;
      }
    }
    index !== undefined && this.state.hidemaps.splice(index, 1);
  }

  _showHideMapElement({ map, show = false } = {}) {
    show ? $(map.getTargetElement()).addClass('show') : $(map.getTargetElement()).removeClass('show');
  }

  createMapImage({ map, background } = {}) {
    return new Promise((resolve, reject) => {
      try {
        const canvas = this.getMapCanvas(map);
        if (navigator.msSaveBlob) resolve(canvas.msToBlob());
        else canvas.toBlob((blob) => resolve(blob));
      } catch (err) {
        reject(err);
      }
    });
  }

  getApplicationAttribution() {
    const { header_terms_of_use_link, header_terms_of_use_text } = this.config.group;
    if (header_terms_of_use_text) {
      return header_terms_of_use_link ? `<a href="${header_terms_of_use_link}">${header_terms_of_use_text}</a>` : `<span class="skin-color" style="font-weight: bold">${header_terms_of_use_text}</span>`;
    } return false;
  }

  slaveOf(mapService, sameLayers) {
    sameLayers = sameLayers || false;
  }

  setLayersExtraParams(params, update) {
    this.layersExtraParams = _.assign(this.layersExtraParams, params);
    this.fire('extraParamsSet', params, update);
  }

  getProject() {
    return this.project;
  }

  getMap() {
    try {
      return this.viewer.map;
    } catch (err) {}
  }

  getMapCanvas(map) {
    const viewport = map ? map.getViewport() : $(`#${this.maps_container} .g3w-map`).last().children('.ol-viewport')[0];
    return $(viewport).find('canvas')[0];
  }

  getProjection() {
    return this.project.getProjection();
  }

  isMapHidden() {
    return this.state.hidden;
  }

  isAxisOrientationInverted() {
    return this.getProjection().getAxisOrientation() === 'neu';
  }

  getCrs() {
    return this.getProjection().getCode();
  }

  getViewerElement() {
    return this.viewer.map.getTargetElement();
  }

  getViewport() {
    return this.viewer.map.getViewport();
  }

  getResolution() {
    return this.viewer.map.getView().getResolution();
  }

  getEpsg() {
    return this.viewer.map.getView().getProjection().getCode();
  }

  getGetFeatureInfoUrlForLayer(layer, coordinates, resolution, epsg, params) {
    const mapLayer = this.getMapLayerForLayer(layer);
    return mapLayer.getGetFeatureInfoUrl(coordinates, resolution, epsg, params);
  }

  /**
   * Show Marker on map
   * @param coordinates
   * @param duration
   */
  showMarker(coordinates, duration = 1000) {
    this._marker.setPosition(coordinates);
    setTimeout(() => this._marker.setPosition(), duration);
  }

  // return layer by name
  getLayerByName(name) {
    return this.getMap().getLayers().getArray().find((lyr) => lyr.get('name') === name);
  }

  // return layer by id
  getLayerById(id) {
    return this.getMap().getLayers().getArray().find((layer) => layer.get('id') === id);
  }

  // method do get all feature from vector layer based on coordinates
  getVectorLayerFeaturesFromCoordinates(layerId, coordinates) {
    let intersectGeom;
    let features = [];
    const map = this.getMap();
    const vectorLayer = this.getLayerById(layerId);
    if (Array.isArray(coordinates)) {
      if (coordinates.length === 2) {
        const pixel = map.getPixelFromCoordinate(coordinates);
        map.forEachFeatureAtPixel(
          pixel,
          (feature) => features.push(feature),
          { layerFilter(layer) { return layer === vectorLayer; } },
        );
      } else if (coordinates.length === 4) {
        intersectGeom = Polygon.fromExtent(coordinates);
        switch (vectorLayer.constructor) {
          case VectorLayer:
            features = vectorLayer.getIntersectedFeatures(intersectGeom);
            break;
          case OLVectorLayer:
            vectorLayer.getSource().getFeatures().forEach((feature) => {
              intersectGeom.intersectsExtent(feature.getGeometry().getExtent()) && features.push(feature);
            });
            break;
        }
      }
    } else if (coordinates instanceof Polygon || coordinates instanceof MultiPolygon) {
      intersectGeom = coordinates;
      switch (vectorLayer.constructor) {
        case VectorLayer:
          features = vectorLayer.getIntersectedFeatures(intersectGeom);
          break;
        case OLVectorLayer:
          vectorLayer.getSource().getFeatures().forEach((feature) => {
            intersectGeom.intersectsExtent(feature.getGeometry().getExtent()) && features.push(feature);
          });
          break;
      }
    }
    return features;
  }

  getQueryLayerByCoordinates({ layer, coordinates } = {}) {
    const mapProjection = this.getProjection();
    const resolution = this.getResolution();
    return new Promise((resolve, reject) => {
      layer.query({
        coordinates,
        mapProjection,
        resolution,
      }).then((response) => resolve(response))
        .fail((err) => reject(err));
    });
  }

  getQueryLayerPromiseByCoordinates({ layer, coordinates } = {}) {
    return new Promise((resolve, reject) => {
      const mapProjection = this.getProjection();
      const resolution = this.getResolution();
      layer.query({
        coordinates,
        mapProjection,
        resolution,
      }).then((response) => {
        resolve(response);
      }).fail((error) => {
        reject(error);
      });
    });
  }

  // setup controls
  /*
    layout : {
      lv: <options> h : horizontal (default), v vertical
      lh: <options> h: horizontal: v vertical (default)
    }
   */

  activeMapControl(controlName) {
    const mapControl = this._mapControls.find((control) => control.type === controlName);
    const { control } = mapControl;
    !control.isToggled() ? control.toggle() : null;
  }

  createMapControl(type, {
    id, add = true, toggled = false, visible, options = {},
  } = {}) {
    id = id || type;
    const control = ControlsFactory.create({
      type,
      toggled,
      ...options,
    });
    visible = visible === undefined ? (control.isVisible ? control.isVisible() : true) : visible;
    control && this.addControl(id, type, control, add, visible);
    return control;
  }

  addScaleLineUnits(units = []) {
    units.forEach((unit) => this.state.mapunits.push(unit));
  }

  changeScaleLineUnit(unit) {
    const scalelinecontrol = this.getMapControlByType({
      type: 'scaleline',
    });
    scalelinecontrol && scalelinecontrol.getOlControl().setUnits(unit);
  }

  showAddLayerModal() {
    this.fire('addexternallayer');
  }

  _checkMapControls() {
    this._changeMapMapControls.forEach(({ control, getLayers }) => {
      const layers = getLayers();
      control.change(layers);
    });
  }

  _setupControls() {
    const baseLayers = geoutils.getMapLayersByFilter({
      BASELAYER: true,
    });
    this.getMapLayers().forEach((mapLayer) => mapLayer.getSource().setAttributions(this.getApplicationAttribution()));
    // check if base layer is set. If true add attribution control
    if (this.getApplicationAttribution() || baseLayers.length) {
      const attributionControl = new Attribution({
        collapsible: false,
        target: 'map_footer_left',
      });
      this.getMap().addControl(attributionControl);
    }

    if (this.config && this.config.mapcontrols) {
      const { mapcontrols } = this.config;
      const feature_count = this.project.getQueryFeatureCount();
      const query_point_tolerance = this.project.getQueryPointTolerance();
      const map = this.getMap();
      mapcontrols.forEach((mapcontrol) => {
        let control;
        // mapcontrol can be a String or object with options
        const controlType = utils.toRawType(mapcontrol) === 'String' ? mapcontrol : mapcontrol.name;
        switch (controlType) {
          case 'reset':
            if (!isMobile.any) {
              control = ControlsFactory.create({
                type: controlType,
              });
            }
            this.addControl(controlType, control, false);
            break;
          case 'zoom':
            control = this.createMapControl(controlType, {
              options: {
                zoomInLabel: '\ue98a',
                zoomOutLabel: '\ue98b',
              },
            });
            break;
          case 'zoombox':
            if (!isMobile.any) {
              control = this.createMapControl(controlType, {});
              control.on('zoomend', (evt) => this.viewer.fit(evt.extent));
            }
            break;
          case 'zoomtoextent':
            control = this.createMapControl(controlType, {
              options: {
                label: '\ue98c',
                extent: this.project.state.initextent,
              },
            });
            break;
          case 'mouseposition':
            if (!isMobile.any) {
              const coordinateLabels = this.getProjection().getUnits() === 'm' ? ['X', 'Y'] : ['Lng', 'Lat'];
              const crs = this.getCrs();
              control = this.createMapControl(controlType, {
                add: false,
                options: {
                  coordinateFormat(coordinate) {
                    return format(coordinate, `\u00A0${coordinateLabels[0]}: {x}, ${coordinateLabels[1]}: {y}\u00A0\u00A0 [${crs}]\u00A0`, 4);
                  },
                  undefinedHTML: false,
                  projection: this.getCrs(),
                },
              });
              if (this.getEpsg() !== 'EPSG:4326') {
                const mapEspg = this.getEpsg();
                const coordinateLabels = ['Lng', 'Lat'];
                const crs = this.getCrs();
                control = this.createMapControl(controlType, {
                  add: false,
                  options: {
                    target: 'mouse-position-control-epsg-4326',
                    coordinateFormat(coordinate) {
                      coordinate = transform(coordinate, mapEspg, 'EPSG:4326');
                      return format(coordinate, `\u00A0${coordinateLabels[0]}: {x}, ${coordinateLabels[1]}: {y}\u00A0\u00A0 [${crs}]\u00A0`, 4);
                    },
                    undefinedHTML: false,
                    projection: this.getCrs(),
                  },
                });
              }
            }
            break;
          case 'screenshot':
          case 'geoscreenshot':
            if (!isMobile.any) {
              control = this.createMapControl(controlType, {
                options: {
                  layers: MapLayersStoreRegistry.getLayers(),
                  onclick: async () => {
                    // Start download show Image
                    const caller_download_id = ApplicationService.setDownload(true);
                    try {
                      const blobImage = await this.createMapImage();
                      if (controlType === 'screenshot') saveAs(blobImage, `map_${Date.now()}.png`);
                      else {
                        const url = `/${this.project.getType()}/api/asgeotiff/${this.project.getId()}/`;
                        const bbox = this.getMapBBOX().toString();
                        const csrfmiddlewaretoken = this.getCookie('csrftoken');
                        try {
                          const geoTIFF = await geoutils.getGeoTIFFfromServer({
                            url,
                            params: {
                              image: blobImage,
                              csrfmiddlewaretoken,
                              bbox,
                            },
                            method: 'POST',
                          });
                          saveAs(geoTIFF, `map_${Date.now()}.tif`);
                        } catch (err) {
                          console.log(err);
                        }
                      }
                    } catch (err) {
                      GUI.showUserMessage({
                        type: 'alert',
                        message: t('mapcontrols.screenshot.error'),
                        autoclose: true,
                      });
                    }
                    // Stop download show Image
                    ApplicationService.setDownload(false, caller_download_id);
                    return true;
                  },
                },
              });
              const change = {
                control,
                getLayers: () => this.getMapLayers(),
              };
              this._changeMapMapControls.push(change);
            }
            break;
          case 'scale':
            control = this.createMapControl(controlType, {
              add: false,
              options: {
                coordinateFormat: createStringXY(4),
                projection: this.getCrs(),
                isMobile: isMobile.any,
              },
            });
            break;
          case 'query':
            control = this.createMapControl(controlType, {
              add: true,
              toggled: true,
            });
            const runQuery = utils.throttle(async (e) => {
              const { coordinates } = e;
              GUI.closeOpenSideBarComponent();
              try {
                const { data = [] } = await DataRouterService.getData('query:coordinates', {
                  inputs: {
                    coordinates,
                    feature_count,
                    query_point_tolerance,
                    multilayers: this.project.isQueryMultiLayers(controlType),
                  },
                });
                data.length && this.showMarker(coordinates);
              } catch (error) {
                console.log(error);
              }
            });
            const eventKey = control.on('picked', runQuery);
            control.setEventKey({
              eventType: 'picked',
              eventKey,
            });
            break;
          case 'querybypolygon':
            if (!isMobile.any) {
              const condition = {
                filtrable: {
                  ows: 'WFS',
                },
              };
              const getControlLayers = () => {
                const controlQuerableLayers = geoutils.getMapLayersByFilter({
                  QUERYABLE: true,
                  SELECTEDORALL: true,
                });
                const controlFiltrableLayers = this.filterableLayersAvailable({
                  FILTERABLE: true,
                  SELECTEDORALL: true,
                }, condition);
                return controlFiltrableLayers.length ? [...new Set([...controlFiltrableLayers, ...controlQuerableLayers])] : [];
              };
              const spatialMethod = 'intersects';
              control = this.createMapControl(controlType, {
                options: {
                  spatialMethod,
                  layers: getControlLayers(),
                  help: {
                    title: 'sdk.mapcontrols.querybypolygon.help.title',
                    message: 'sdk.mapcontrols.querybypolygon.help.message',
                  },
                },
              });
              if (control) {
                const change = {
                  control,
                  getLayers: getControlLayers,
                };
                this._changeMapMapControls.push(change);
                const runQuery = utils.throttle(async (e) => {
                  GUI.closeOpenSideBarComponent();
                  const { coordinates } = e;
                  // ask for coordinates
                  try {
                    const { data: dataCoordinates = [] } = await DataRouterService.getData('query:coordinates', {
                      inputs: {
                        feature_count,
                        coordinates,
                      },
                      outputs: {
                        show({ data = [], query }) {
                          const show = data.length === 0;
                          // set coordinates to null to avoid that externalvector added to query result
                          // response to coordinates
                          query.coordinates = !show && null;
                          return show;
                        },
                      },
                    });
                    if (dataCoordinates.length && dataCoordinates[0].features.length) {
                      const feature = dataCoordinates[0].features[0];
                      const excludeLayers = [dataCoordinates[0].layer];
                      const { data = [] } = await DataRouterService.getData('query:polygon', {
                        inputs: {
                          excludeLayers,
                          feature,
                          filterConfig: {
                            spatialMethod: control.getSpatialMethod(), // added spatial method to polygon filter
                          },
                          multilayers: this.project.isQueryMultiLayers(controlType),
                        },
                        outputs: {
                          show({ error = false }) {
                            return !error;
                          },
                        },
                      });
                      data.length && map.getView().setCenter(coordinates);
                    }
                  } catch (err) {
                    console.log(err);
                  }
                });
                const eventKey = control.on('picked', runQuery);
                control.setEventKey({
                  eventType: 'picked',
                  eventKey,
                });
              }
            }
            break;
          case 'querybbox':
            if (!isMobile.any) {
              const condition = {
                filtrable: {
                  ows: 'WFS',
                },
              };
              const getControlLayers = () => {
                const layers = this.filterableLayersAvailable(condition) || [];
                layers.forEach((layer) => layer.setTocHighlightable(true));
                return layers;
              };
              // check the start iniztial layer available to create and add querybobx control to map
              const layers = getControlLayers();
              const spatialMethod = 'intersects';
              control = this.createMapControl(controlType, {
                options: {
                  spatialMethod,
                  layers,
                  help: {
                    title: 'sdk.mapcontrols.querybybbox.help.title',
                    message: 'sdk.mapcontrols.querybybbox.help.message',
                  },
                },
              });
              if (control) {
                const change = {
                  control,
                  getLayers: getControlLayers,
                };
                this._changeMapMapControls.push(change);
                // get all filtrable layers in toc no based on selection or visibility
                const layersFilterObject = {
                  SELECTEDORALL: true, // selected or all
                  FILTERABLE: true,
                  VISIBLE: true,
                };
                const runQuery = utils.throttle(async (e) => {
                  GUI.closeOpenSideBarComponent();
                  const bbox = e.extent;
                  try {
                    const { data = [] } = await DataRouterService.getData('query:bbox', {
                      inputs: {
                        bbox,
                        feature_count,
                        layersFilterObject,
                        filterConfig: {
                          spatialMethod: control.getSpatialMethod(), // added spatial method to polygon filter
                        },
                        condition,
                        multilayers: this.project.isQueryMultiLayers(controlType),
                      },
                    });
                    if (data.length) {
                      const center = getCenter(bbox);
                      this.getMap().getView().setCenter(center);
                    }
                  } catch (err) {
                    console.log(err);
                  }
                });
                const eventKey = control.on('bboxend', runQuery);
                control.setEventKey({
                  eventType: 'bboxend',
                  eventKey,
                });
              }
            }
            break;
          case 'streetview':
            // streetview
            let active = false;
            const streetViewService = new StreetViewService();
            control = this.createMapControl(controlType, {});
            streetViewService.init()
              .then(() => {
                control.setProjection(this.getProjection());
                this.viewer.map.addLayer(control.getLayer());
                const position = {
                  lat: null,
                  lng: null,
                };
                const closeContentFnc = () => {
                  control.clearMarker();
                  active = false;
                };
                streetViewService.onafter('postRender', (position) => control.setPosition(position));
                if (control) {
                  this._setMapControlVisible({
                    control,
                    visible: true,
                  });
                  control.on('picked', utils.throttle((e) => {
                    GUI.off('closecontent', closeContentFnc);
                    active = true;
                    const { coordinates } = e;
                    const lonlat = transform(coordinates, this.getProjection().getCode(), 'EPSG:4326');
                    position.lat = lonlat[1];
                    position.lng = lonlat[0];
                    streetViewService.showStreetView(position);
                    GUI.on('closecontent', closeContentFnc);
                  }));
                  control.on('disabled', () => {
                    active && GUI.closeContent();
                    GUI.off('closecontent', closeContentFnc);
                  });
                }
              }).catch(() => this.removeControl(controlType));
            break;
          case 'scaleline':
            control = this.createMapControl(controlType, {
              add: false,
              options: {
                position: 'br',
              },
            });
            break;
          case 'overview':
            if (!isMobile.any) {
              if (!this.config.overviewproject) return;
              const overviewProjectGid = this.config.overviewproject.gid;
              if (overviewProjectGid) {
                ProjectsRegistry.getProject(overviewProjectGid)
                  .then((project) => {
                    const overViewMapLayers = this.getOverviewMapLayers(project);
                    const viewOptions = this._calculateViewOptions({
                      width: 200, // at moment hardcoded
                      height: 150,
                      project,
                    });
                    const view = new View(viewOptions);
                    const mainView = this.getMap().getView();
                    view.on('change:center', function () {
                      const currentCenter = this.getCenter();
                      const center = mainView.constrainCenter(currentCenter);
                      center[0] !== currentCenter[0] || center[1] !== currentCenter[1] && view.setCenter(center);
                    });
                    control = this.createMapControl(controlType, {
                      add: false,
                      options: {
                        position: 'bl',
                        className: 'ol-overviewmap ol-custom-overviewmap',
                        collapseLabel: $(`<span class="${GUI.getFontClass('arrow-left')}"></span>`)[0],
                        label: $(`<span class="${GUI.getFontClass('arrow-right')}"></span>`)[0],
                        collapsed: false,
                        layers: overViewMapLayers,
                        view,
                      },
                    });
                  });
              }
            }
            break;
          case 'nominatim':
            const lonlat = (coordinates) => {
              this.zoomToExtent([...coordinates, ...coordinates]);
              setTimeout(() => this.showMarker(coordinates), 1000);
            };
            control = this.createMapControl(controlType, {
              add: false,
              options: {
                lonlat,
                isMobile: isMobile.any,
                bbox: this.project.state.extent,
                mapCrs: this.project.state.crs.epsg,
                placeholder: 'mapcontrols.nominatim.placeholder',
                noresults: 'mapcontrols.nominatim.noresults',
                notresponseserver: 'mapcontrols.nominatim.notresponseserver',
                fontIcon: GUI.getFontClass('search'),
              },
            });
            control.on('addresschosen', (evt) => {
              const { coordinate } = evt;
              const geometry = new Point(coordinate);
              this.highlightGeometry(geometry);
            });

            $('#search_nominatim').click(utils.debounce(() => {
              control.nominatim.query($('input.gcd-txt-input').val());
            }));
            break;
          case 'geolocation':
            control = this.createMapControl(controlType);
            control.on('click', utils.throttle((evt) => this.showMarker(evt.coordinates)));
            control.on('error', (evt) => {
              GUI.showUserMessage({
                type: 'warning',
                message: 'mapcontrols.geolocations.error',
                autoclose: true,
              });
            });
            break;
          case 'addlayers':
            if (!isMobile.any) {
              control = this.createMapControl(controlType, {});
              control.on('addlayer', () => this.fire('addexternallayer'));
            }
            break;
          case 'length':
            if (!isMobile.any) {
              control = this.createMapControl(controlType, {
                options: {
                  tipLabel: 'sdk.mapcontrols.measures.length.tooltip',
                  interactionClassOptions: {
                    projection: this.getProjection(),
                    help: 'sdk.mapcontrols.measures.length.help',
                  },
                },
              });
            }
            break;
          case 'area':
            if (!isMobile.any) {
              control = this.createMapControl(controlType, {
                options: {
                  tipLabel: 'sdk.mapcontrols.measures.area.tooltip',
                  interactionClassOptions: {
                    projection: this.getProjection(),
                    help: 'sdk.mapcontrols.measures.area.help',
                  },
                },
              });
            }
            break;
        }
      });
      return this.getMapControls();
    }
  }

  /**
   *  Set ZIndex layer from fa stack
   */
  setZIndexLayer({ layer, zindex = map.getLayers().getLength() } = {}) {
    layer && layer.setZIndex(zindex);
  }

  /**
   *
   * Get map stack layer position
   */
  getLayerZindex(layer) {
    return layer && layer.getZIndex();
  }

  getCenter() {
    const map = this.getMap();
    return map.getView().getCenter();
  }

  /**
   *
   *method to zoom to feature
   */
  zoomToFid = async function (zoom_to_fid = '', separator = '|') {
    const [layerId, fid] = zoom_to_fid.split(separator);
    if (layerId !== undefined && fid !== undefined) {
      const layer = this.project.getLayerById(layerId);
      const { data = [] } = await DataRouterService.getData('search:fids', {
        inputs: {
          layer,
          fids: [fid],
        },
        outputs: {
          show: {
            loading: false,
            condition({ data = [] } = {}) {
              return data[0] && data[0].features.length > 0;
            },
          },
        },
      });
      const feature = data[0] && data[0].features[0];
      feature && this.zoomToFeatures([feature]);
    }
  };

  /**
   * Method to handele ztf url parameter
   * @param zoom_to_feature
   */
  handleZoomToFeaturesUrlParameter = async function ({ zoom_to_features = '', search_endpoint = 'api' } = {}) {
    try {
      const [layerNameorId, fieldsValuesSearch] = zoom_to_features.split(':');
      if (layerNameorId && fieldsValuesSearch) {
        const projectLayer = this.project.getLayers().find((layer) => layer.id === layerNameorId || layer.name === layerNameorId);
        if (projectLayer) {
          const layer = this.project.getLayerById(projectLayer.id);
          const filter = utils.createFilterFromString({
            layer,
            search_endpoint,
            filter: fieldsValuesSearch,
          });
          const { data } = await DataRouterService.getData('search:features', {
            inputs: {
              layer,
              filter,
              search_endpoint,
            },
            outputs: {
              show: {
                loading: false,
              },
            },
          });
          data && data[0] && data[0].features && this.zoomToFeatures(data[0].features);
        }
      }
    } catch (err) {
      console.log(err);
    }
  };

  getMapExtent() {
    const map = this.getMap();
    return map.getView().calculateExtent(map.getSize());
  }

  addMapExtentUrlParameterToUrl(url) {
    url = new URL(url);
    const map_extent = this.getMapExtent().toString();
    url.searchParams.set('map_extent', map_extent);
    return url.toString();
  }

  getMapExtentUrl() {
    const url = new URL(location.href);
    const map_extent = this.getMapExtent().toString();
    url.searchParams.set('map_extent', map_extent);
    return url.toString();
  }

  createCopyMapExtentUrl() {
    const url = this.getMapExtentUrl();
    utils.copyUrl(url);
  }

  _setMapControlsGrid(length) {
    const { grid } = this.state.mapControl;
    if (length < 2) {
      const rC = grid[grid.length - 1];
      grid.push({
        rows: rC.rows * 2,
        columns: 2,
      });
      return;
    }
    if (length === 2) {
      if (grid.length) {
        const rC = grid[grid.length - 1];
        grid.push({
          rows: rC.columns,
          columns: rC.rows,
        });
      } else {
        grid.push({
          rows: 1,
          columns: 2,
        });
      }
    } else if (length === 3) {
      const rC = grid[grid.length - 1];
      grid.push({
        rows: 2 * rC.rows,
        columns: length,
      });
    } else {
      grid.push({
        rows: grid.length + 1 + (Number.isInteger(length) ? 0 : 1),
        columns: Number.isInteger(length) ? length : parseInt(length) + 1,
      });
      const _length = Number.isInteger(length) ? length : parseInt(length);
      this._setMapControlsGrid(_length / 2);
    }
  }

  _setMapControlsInsideContainerLenght() {
    this.state.mapControl.length = 1;
    // count the mapcontrol inside g3w-map-control container
    this._mapControls.forEach((control) => {
      const map = this.getMap();
      this.state.mapControl.length += control.mapcontrol ? control.id === 'zoom' ? 2 : 1 : 0;
      control.control.changelayout ? control.control.changelayout(map) : null;
    });
    // add 1 id odd number
    this.state.mapControl.length += this.state.mapControl.length % 2;
    this.state.mapControl.grid = [];
    this._setMapControlsGrid(this.state.mapControl.length);
  }

  /**
   * Get filtrable layer. Get parameter to custom filter Object
   */
  filterableLayersAvailable(options = {}) {
    const layers = geoutils.getMapLayersByFilter({
      FILTERABLE: true,
      SELECTEDORALL: true,
    }, options);
    return layers.filter((layer) => layer.getProvider('filter') instanceof WFSProvider);
  }

  setMapControlsAlignement(alignement = 'rv') {
    this.state.mapcontrolsalignement = alignement;
  }

  getMapControlsAlignement() {
    return this.state.mapcontrolsalignement;
  }

  isMapControlsVerticalAlignement() {
    return this.state.mapcontrolsalignement.indexOf('v') !== -1;
  }

  setMapControlsVerticalAlignement() {
    this.state.mapcontrolsalignement = `${this.state.mapcontrolsalignement[0]}v`;
  }

  setMapControlsHorizontalAlignement() {
    this.state.mapcontrolsalignement = `${this.state.mapcontrolsalignement[0]}h`;
  }

  flipControlsHorizontally() {
    this.state.mapcontrolsalignement = this.state.mapcontrolsalignement[0] === 'r' ? `l${this.state.mapcontrolsalignement[1]}` : `r${this.state.mapcontrolsalignement[1]}`;
  }

  flipMapControlsVertically() {
    this.state.mapcontrolsalignment = this.state.mapcontrolsalignement[1] === 'v' ? `${this.state.mapcontrolsalignement[0]}h` : `${this.state.mapcontrolsalignement[0]}v`;
  }

  setMapControlsContainer(mapControlDom) {
    this.state.mapcontrolDOM = mapControlDom;
  }

  _updateMapControlsLayout({ width, height } = {}) {
    // case mobile open keyboard
    (width == 0 || height == 0) ? this.state.mapcontrolDOM.css('z-index', 0) : this.state.mapcontrolDOM.css('z-index', 100);
    // update only when all control are ready
    if (this.state.mapcontrolready && this.state.mapControl.update) {
      const changedAndMoreSpace = {
        changed: false,
        space: false,
      };
      // count the mapcontrol insied g3w-map-control container
      this._mapControls.forEach((control) => {
        const map = this.getMap();
        control.control.changelayout ? control.control.changelayout(map) : null;
      });
      // check if is vertical
      if (this.isMapControlsVerticalAlignement()) {
        const handleVerticalMapControlDOMElements = () => {
          const mapControslHeight = this.state.mapControl.grid[this.state.mapControl.currentIndex].columns * this.state.mapcontrolSizes.minWidth;
          // get bottom controls
          const bottomMapControls = $(`.ol-control-b${this.getMapControlsAlignement()[0]}`);
          const bottomMapControlTop = bottomMapControls.length ? $(bottomMapControls[bottomMapControls.length - 1]).position().top : height;
          const freeSpace = bottomMapControlTop > 0 ? bottomMapControlTop - mapControslHeight : height - mapControslHeight;
          if (freeSpace < 10) {
            if (isMobile.any) {
              this.setMapControlsAlignement('rh');
              return;
            } this.state.mapControl.currentIndex = this.state.mapControl.currentIndex === this.state.mapControl.grid.length - 1 ? this.state.mapControl.currentIndex : this.state.mapControl.currentIndex + 1;
            changedAndMoreSpace.changed = true;
          } else {
            // check if there enought space to expand mapcontrols
            const nextHeight = this.state.mapControl.currentIndex > 0 ? (this.state.mapControl.grid[this.state.mapControl.currentIndex - 1].columns * this.state.mapcontrolSizes.minWidth) - mapControslHeight : mapControslHeight;
            if (freeSpace > nextHeight) {
              changedAndMoreSpace.changed = true;
              changedAndMoreSpace.space = true;
              this.state.mapControl.currentIndex = this.state.mapControl.currentIndex === 0 ? this.state.mapControl.currentIndex : this.state.mapControl.currentIndex - 1;
            }
          }
          if (changedAndMoreSpace.changed) {
            const mapControslHeight = this.state.mapControl.grid[this.state.mapControl.currentIndex].columns * this.state.mapcontrolSizes.minWidth;
            const mapControlsWidth = this.state.mapControl.grid[this.state.mapControl.currentIndex].rows * this.state.mapcontrolSizes.minWidth;
            this.state.mapcontrolDOM.css('height', `${mapControslHeight}px`);
            this.state.mapcontrolDOM.css('width', `${mapControlsWidth}px`);
            changedAndMoreSpace.changed = false;
            changedAndMoreSpace.space && setTimeout(() => handleVerticalMapControlDOMElements());
          }
        };
        handleVerticalMapControlDOMElements();
      } else isMobile.any && this.setMapControlsAlignement('rv');
    }
  }

  /**
   *
   * @param control
   * @param visible
   * @private
   */
  _setMapControlVisible({ control, visible = true }) {
    control && control.setVisible(visible);
  }

  _addControlToMapControls(control, visible = true) {
    const controlElement = control.element;
    if (!visible) control.element.style.display = 'none';
    $('.g3w-map-controls').append(controlElement);
  }

  getMapControlByType({ type } = {}) {
    const mapControl = this._mapControls.find((mapControl) => type === mapControl.type);
    return mapControl && mapControl.control;
  }

  /**
   *
   *
   * @param id
   * @param type
   * @param control
   * @param addToMapControls
   * @param visible
   */
  addControl(id, type, control, addToMapControls = true, visible = true) {
    this.state.mapcontrolready = false;
    this.viewer.map.addControl(control);
    control.on('toggled', (evt) => this.fire('mapcontrol:toggled', evt));
    this._mapControls.push({
      id,
      type,
      control,
      visible,
      mapcontrol: addToMapControls && visible,
    });
    control.on('controlclick', (evt) => {
      const { target: mapcontrol } = evt;
      const info = {
        clickmap: mapcontrol.isClickMap && mapcontrol.isClickMap() || false,
      };
      info.clickmap && this._externalInteractions.forEach((interaction) => interaction.setActive(false));
      this.controlClick(mapcontrol, info);
    });
    const buttonControl = $(control.element).find('button');
    buttonControl.tooltip({
      placement: 'bottom',
      trigger: GUI.isMobile() ? 'click' : 'hover',
    });
    // in case of mobile hide tooltip after click
    GUI.isMobile() && buttonControl.on('shown.bs.tooltip', function () {
      setTimeout(() => $(this).tooltip('hide'), 600);
    });
    if (addToMapControls) this._addControlToMapControls(control, visible);
    else {
      const $mapElement = $(`#${this.getMap().getTarget()}`);
      this._updateMapControlsLayout({
        width: $mapElement.width(),
        height: $mapElement.height(),
      });
    }
    ControlsRegistry.registerControl(type, control);
    this._setMapControlsInsideContainerLenght();
    this.state.mapcontrolready = true;
  }

  showControl(type) {
    this.showControls([type]);
  }

  hideControl(type) {
    this.hideControls([type]);
  }

  showControls(types) {
    this.toggleControls(true, types);
  }

  hideControls(types) {
    this.toggleControls(false, types);
  }

  showAllControls() {
    this.toggleControls(true);
  }

  hideAllControls() {
    this.toggleControls(false);
  }

  toggleControls(toggle, types) {
    this._removeControls();
    this._mapControls.forEach((controlObj) => {
      if (types) {
        if (types.indexOf(controlObj.type) > -1) controlObj.visible = toggle;
      } else controlObj.visible = toggle;
    });
    this._layoutControls();
  }

  _layoutControls() {
    this._mapControls.forEach((controlObj) => {
      if (controlObj.visible) this.viewer.map.addControl(controlObj.control);
    });
  }

  getMapControls() {
    return this._mapControls;
  }

  removeControlById(id) {
    this._mapControls.find((controlObj, ctrlIdx) => {
      if (id === controlObj.id) {
        this._mapControls.splice(ctrlIdx, 1);
        const { control } = controlObj;
        this.viewer.map.removeControl(control);
        control.hideControl && control.hideControl();
        return true;
      }
    });
  }

  removeControl(type) {
    this._mapControls.find((controlObj, ctrlIdx) => {
      if (type === controlObj.type) {
        this._mapControls.splice(ctrlIdx, 1);
        const { control } = controlObj;
        this.viewer.map.removeControl(control);
        control.hideControl && control.hideControl();
        return true;
      }
    });
  }

  _removeControls() {
    this._mapControls.forEach((controlObj) => this.viewer.map.removeControl(controlObj.control));
  }

  /**
   * untoggle mapcontrol
   * @param close GUI content
   * @private
   */
  _unToggleControls({ close = true } = {}) {
    this._mapControls.forEach((controlObj) => {
      if (controlObj.control.isToggled && controlObj.control.isToggled()) {
        controlObj.control.toggle(false);
        close && GUI.closeContent();
      }
    });
  }

  deactiveMapControls() {
    this._unToggleControls({
      close: false,
    });
  }

  /**
   *
   * Method to disable
   */
  disableClickMapControls(bool = true) {
    this._mapControls.forEach((controlObj) => {
      const { control } = controlObj;
      const clickmap = control.isClickMap ? control.isClickMap() : false;
      if (clickmap) {
        control.isToggled() && control.toggle();
        control[bool ? 'disable' : 'enable']();
      }
    });
  }

  addMapLayers(mapLayers) {
    mapLayers.reverse().forEach((mapLayer) => this.addMapLayer(mapLayer));
  }

  _setupCustomMapParamsToLegendUrl(bool = true) {
    if (bool) {
      const map = this.getMap();
      const size = map && map.getSize().filter((value) => value > 0) || null;
      let bbox = size && size.length === 2 ? map.getView().calculateExtent(size) : this.project.state.initextent;
      // in case of axis orientation inverted i need to iverted the axis
      bbox = map.getView().getProjection().getAxisOrientation() === 'neu' ? [bbox[1], bbox[0], bbox[3], bbox[2]] : bbox;
      const crs = this.getEpsg();
      // setup initial legend parameter
      this.getMapLayers().forEach((mapLayer) => {
        mapLayer.setupCustomMapParamsToLegendUrl && mapLayer.setupCustomMapParamsToLegendUrl({
          crs,
          bbox,
        });
      });
    }
    this.fire('change-map-legend-params');
  }

  addMapLayer(mapLayer) {
    this._mapLayers.push(mapLayer);
    this.addLayerToMap(mapLayer);
  }

  getMapLayerByLayerId(layerId) {
    return this.getMapLayers().find((mapLayer) => mapLayer.getLayerConfigs().find((layer) => layer.getId() === layerId));
  }

  getMapLayers() {
    return this._mapLayers;
  }

  getBaseLayers() {
    return this.mapBaseLayers;
  }

  getMapLayerForLayer(layer) {
    const multilayerId = `layer_${layer.getMultiLayerId()}`;
    const mapLayers = this.getMapLayers();
    const mapLayer = mapLayers.find((mapLayer) => mapLayer.getId() === multilayerId);
    return mapLayer;
  }

  getProjectLayer(layerId) {
    return MapLayersStoreRegistry.getLayerById(layerId);
  }

  _setSettings() {
    const { ZOOM } = MAP_SETTINGS;
    const maxScale = this.getScaleFromExtent(this.project.state.initextent);
    // settings maxScale
    ZOOM.maxScale = ZOOM.maxScale > maxScale ? maxScale : ZOOM.maxScale;
  }

  _resetView() {
    const [width, height] = this.viewer.map.getSize();
    const { extent } = this.project.state;
    const maxxRes = getWidth(extent) / width;
    const minyRes = getHeight(extent) / height;
    const maxResolution = Math.max(maxxRes, minyRes) > this.viewer.map.getView().getMaxResolution() ? Math.max(maxxRes, minyRes) : this.viewer.map.getView().getMaxResolution();
    const view = new View({
      extent,
      projection: this.viewer.map.getView().getProjection(),
      center: this.viewer.map.getView().getCenter(),
      resolution: this.viewer.map.getView().getResolution(),
      maxResolution,
    });
    this._setSettings();
    this.viewer.map.setView(view);
  }

  _calculateViewOptions({ project, width, height } = {}) {
    const searchParams = new URLSearchParams(location.search);
    const map_extent = searchParams.get('map_extent');
    const zoom_to_fid = searchParams.get('zoom_to_fid');
    const zoom_to_features = searchParams.get('ztf'); // zoom to features
    const lat_lon = searchParams.get('lat') && searchParams.get('lon') && {
      lat: 1 * searchParams.get('lat'),
      lon: 1 * searchParams.get('lon'),
    };
    const x_y = searchParams.get('x') && searchParams.get('y') && {
      x: 1 * searchParams.get('x'),
      y: 1 * searchParams.get('y'),
    };
    if (zoom_to_fid) this.zoomToFid(zoom_to_fid);
    else if (zoom_to_features) this.handleZoomToFeaturesUrlParameter({ zoom_to_features });
    else if (lat_lon && !Number.isNaN(lat_lon.lat) && !Number.isNaN(lat_lon.lon)) {
      setTimeout(() => {
        const geometry = new Point(transform([lat_lon.lon, lat_lon.lat], 'EPSG:4326', this.getEpsg()));
        if (geometry.getExtent()) this.zoomToGeometry(geometry);
      });
    } else if (x_y && !Number.isNaN(x_y.x) && !Number.isNaN(x_y.y)) {
      setTimeout(() => {
        const geometry = new Point([x_y.x, x_y.y]);
        this.zoomToGeometry(geometry);
      });
    }
    const initextent = map_extent ? map_extent.split(',').map((coordinate) => 1 * coordinate) : project.state.initextent;
    const projection = this.getProjection();
    const { extent } = project.state;
    const maxxRes = getWidth(extent) / width;
    const maxyRes = getHeight(extent) / height;
    const maxResolution = Math.max(maxxRes, maxyRes);
    const initxRes = getWidth(initextent) / width;
    const inityRes = getHeight(initextent) / height;
    const resolution = Math.max(initxRes, inityRes);
    const center = getCenter(initextent);
    return {
      projection,
      center,
      extent,
      maxResolution,
      resolution,
    };
  }

  // set view based on project config
  _setupViewer(width, height) {
    this.viewer = MapHelper.createViewer({
      id: this.target,
      view: this._calculateViewOptions({
        width,
        height,
        project: this.project,
      }),
    });
    this._setSettings();
    this.state.size = this.viewer.map.getSize();
    // set mapunit
    this.state.mapUnits = this.viewer.map.getView().getProjection().getUnits();

    if (this.config.background_color) {
      $(`#${this.target}`).css('background-color', this.config.background_color);
    }

    $(this.viewer.map.getViewport()).prepend('<div id="map-spinner" style="position:absolute; top: 50%; right: 50%"></div>');

    this.viewer.map.getInteractions().forEach((interaction) => this._watchInteraction(interaction));

    this.viewer.map.getInteractions().on('add', (interaction) => this._watchInteraction(interaction.element));

    this.viewer.map.getInteractions().on('remove', (interaction) => {
      // this._onRemoveInteraction(interaction););
    });

    this._marker = new Overlay({
      position: null,
      positioning: 'center-center',
      element: document.getElementById('marker'),
      stopEvent: false,
    });

    this.viewer.map.addOverlay(this._marker);

    /**
     *
     * Register map addLayer
     *
     */
    this.viewer.map.getLayers().on('add', (evt) => {
      const { element: layer } = evt;
      const basemap = layer.get('basemap');
      const position = layer.get('position');
      let zindex = basemap && 0;
      if (position && position === 'bottom') zindex = 1;
      this.setLayerZIndex({
        layer,
        zindex,
      });
    });

    this.viewer.map.getLayers().on('remove', (evt) => {
      const { element: layer } = evt;
      const layerZIndex = layer.getZIndex();
      if (layerZIndex === this.layersCount) this.layersCount -= 1;
    });
  }

  getMapUnits() {
    return this.state.mapUnits;
  }

  _removeListeners() {
    this._setBaseLayerListenerKey && this.project.un('setBaseLayer', this._setBaseLayerListenerKey);
  }

  // remove all events of layersStore
  _removeEventsKeysToLayersStore(layerStore) {
    const layerStoreId = layerStore.getId();
    if (this._layersStoresEventKeys[layerStoreId]) {
      this._layersStoresEventKeys[layerStoreId].forEach((eventObj) => {
        Object.entries(eventObj).forEach(([event, eventKey]) => layerStore.un(event, eventKey));
      });
      delete this._layersStoresEventKeys[layerStoreId];
    }
  }

  // register all events of layersStore and relative keys
  _setUpEventsKeysToLayersStore(layerStore) {
    const layerStoreId = layerStore.getId();
    // check if already store a key of events
    this._layersStoresEventKeys[layerStoreId] = [];
    // ADD LAYER
    const addLayerKey = layerStore.onafter('addLayer', (layer) => {
      if (layer.getType() === 'vector') {
        const mapLayer = layer.getMapLayer();
        this.addLayerToMap(mapLayer);
      }
    });
    this._layersStoresEventKeys[layerStoreId].push({
      addLayer: addLayerKey,
    });
    // REMOVE LAYER
    const removeLayerKey = layerStore.onafter('removeLayer', (layer) => {
      if (layer.getType() === 'vector') {
        const olLayer = layer.getOLLayer();
        this.viewer.map.removeLayer(olLayer);
      }
    });

    this._layersStoresEventKeys[layerStoreId].push({
      removeLayer: removeLayerKey,
    });
  }

  _setupListeners() {
    this._setBaseLayerListenerKey = this.project.onafter('setBaseLayer', () => {
      this.updateMapLayers();
    });
  }

  // SETUP ALL LAYERS
  _setupAllLayers() {
    this._setupBaseLayers();
    this._setupMapLayers();
    this._setupVectorLayers();
    this._setUpDefaultLayers();
  }

  // SETUP BASELAYERS
  _setupBaseLayers() {
    const baseLayers = geoutils.getMapLayersByFilter({
      BASELAYER: true,
    });
    if (!baseLayers.length) return;
    baseLayers.forEach((layer) => {
      const baseMapLayer = layer.getMapLayer();
      this.registerMapLayerListeners(baseMapLayer);
      this.mapBaseLayers[layer.getId()] = baseMapLayer;
    });
    const reverseBaseLayers = Object.values(this.mapBaseLayers).reverse();
    reverseBaseLayers.forEach((baseMapLayer) => {
      baseMapLayer.update(this.state, this.layersExtraParams);
      this.addLayerToMap(baseMapLayer);
    });
  }

  // SETUP MAPLAYERS
  _setupMapLayers() {
    // get all geolayers exclude baselayers and eventually vector layers
    const layers = geoutils.getMapLayersByFilter({
      BASELAYER: false,
      VECTORLAYER: false,
    });
    this._setMapProjectionToLayers(layers);
    // group layer by mutilayer (multilayer property of layer on project configuration)
    // nee to split time series to group to speed up eventualli time seriesries loading of single layer
    let qtimeseries_multilayerid_split_values = {};
    const multiLayers = _.groupBy(layers, (layer) => {
      let multiLayerId = layer.getMultiLayerId();
      if (layer.isQtimeseries()) {
        qtimeseries_multilayerid_split_values[multiLayerId] = qtimeseries_multilayerid_split_values[multiLayerId] === undefined ? 0 : qtimeseries_multilayerid_split_values[multiLayerId] + 1;
        multiLayerId = `${multiLayerId}_${qtimeseries_multilayerid_split_values[multiLayerId]}`;
      } else {
        multiLayerId = qtimeseries_multilayerid_split_values[multiLayerId] === undefined
          ? multiLayerId : `${multiLayerId}_${qtimeseries_multilayerid_split_values[multiLayerId] + 1}`;
      }
      return multiLayerId;
    });
    qtimeseries_multilayerid_split_values = null; // delete to garbage collector
    const mapLayers = [];
    Object.entries(multiLayers).forEach(([id, layers]) => {
      const multilayerId = `layer_${id}`;
      let mapLayer;
      const layer = layers[0] || [];
      if (layers.length === 1) {
        mapLayer = layer.getMapLayer({
          id: multilayerId,
          projection: this.getProjection(),
        }, {});
        mapLayer.addLayer(layer);
        mapLayers.push(mapLayer);
      } else {
        mapLayer = layer.getMapLayer({
          id: multilayerId,
          projection: this.getProjection(),
        }, this.layersExtraParams);
        layers.reverse().forEach((sub_layer) => mapLayer.addLayer(sub_layer));
        mapLayers.push(mapLayer);
      }
      this.registerMapLayerListeners(mapLayer);
    });
    this.addMapLayers(mapLayers);
    this.updateMapLayers();
    return mapLayers;
  }

  // SETUP VECTORLAYERS
  _setupVectorLayers() {
    const layers = geoutils.getMapLayersByFilter({
      VECTORLAYER: true,
    });
    this._setMapProjectionToLayers(layers);
    layers.forEach((layer) => {
      const mapVectorLayer = layer.getMapLayer();
      this.addLayerToMap(mapVectorLayer);
    });
  }

  _setUpDefaultLayers() {
    // follow the order that i want
    this.getMap().addLayer(this.defaultsLayers.highlightLayer);
    this.getMap().addLayer(this.defaultsLayers.selectionLayer);
  }

  removeDefaultLayers() {
    this.defaultsLayers.highlightLayer.getSource().clear();
    this.defaultsLayers.selectionLayer.getSource().clear();
    this.getMap().removeLayer(this.defaultsLayers.highlightLayer);
    this.getMap().removeLayer(this.defaultsLayers.selectionLayer);
  }

  setDefaultLayerStyle(type, style = {}) {
    if (type && this.defaultsLayers[type]) this.defaultsLayers._style[type] = style;
  }

  resetDefaultLayerStyle(type, style = {}) {
    if (type && this.defaultsLayers[type]) {
      this.defaultsLayers._style[type] = {
        color: type === 'highlightLayer' ? undefined : 'red',
      };
    }
  }

  removeLayers() {
    this._removeBaseLayers();
    this._removeMapLayers();
    this.removeExternalLayers();
    this.removeDefaultLayers();
  }

  removeAllLayers() {
    this.viewer.removeLayers();
  }

  // set ad increase layerIndex
  setLayerZIndex({ layer, zindex = this.layersCount += 1 }) {
    layer.setZIndex(zindex);
  }

  /**
   * Add olLayer to mapLayer
   * @param layer
   */
  addLayerToMap(layer) {
    const olLayer = layer.getOLLayer();
    olLayer && this.getMap().addLayer(olLayer);
  }

  _setMapProjectionToLayers(layers) {
    // setup mapProjection on ech layers
    layers.forEach((layer) => layer.setMapProjection(this.getProjection()));
  }

  createMapLayer(layer) {
    layer.setMapProjection(this.getProjection());
    const multilayerId = `layer_${layer.getMultiLayerId()}`;
    const mapLayer = layer.getMapLayer({
      id: multilayerId,
      projection: this.getProjection(),
    }, this.layersExtraParams);
    mapLayer.addLayer(layer);
    return mapLayer;
  }

  getOverviewMapLayers(project) {
    const projectLayers = project.getLayersStore().getLayers({
      GEOLAYER: true,
      BASELAYER: false,
    });
    const multiLayers = _.groupBy(projectLayers, (layer) => layer.getMultiLayerId());
    const overviewMapLayers = [];

    Object.entries(multiLayers).forEach(([id, layers]) => {
      const multilayerId = `overview_layer_${id}`;
      const { tiled } = layers[0].state;
      const config = {
        url: project.getWmsUrl(),
        id: multilayerId,
        tiled,
      };
      const mapLayer = new WMSLayer(config);
      layers.reverse().forEach((layer) => mapLayer.addLayer(layer));
      overviewMapLayers.push(mapLayer.getOLLayer(true));
    });
    return overviewMapLayers.reverse();
  }

  /**
   * method to update MapLayer
   * @param mapLayer
   * @param options
   */
  updateMapLayer(mapLayer, options = { force: false }, { showSpinner = true } = {}) {
    // if force add g3w_time parametter to force request of map layer from server
    if (options.force) options.g3w_time = Date.now();
    if (showSpinner !== mapLayer.showSpinnerWhenLoading) {
      mapLayer.showSpinnerWhenLoading = showSpinner;
      this[showSpinner ? 'registerMapLayerLoadingEvents' : 'unregisterMapLayerLoadingEvents'](mapLayer);
    }
    mapLayer.update(this.state, options);
    return mapLayer;
  }

  // run update function on each mapLayer
  updateMapLayers(options = {}) {
    this.getMapLayers().forEach((mapLayer) => this.updateMapLayer(mapLayer, options));
    const baseLayers = this.getBaseLayers();
    // updatebase layer
    Object.values(baseLayers).forEach((baseLayer) => baseLayer.update(this.state, this.layersExtraParams));
  }

  // register map Layer listeners of creation
  registerMapLayerListeners(mapLayer, projectLayer = true) {
    this.registerMapLayerLoadingEvents(mapLayer);
    // listen change filter token
    if (projectLayer && mapLayer.layers && Array.isArray(mapLayer.layers)) {
      mapLayer.layers.forEach((layer) => {
        layer.onbefore('change', () => this.updateMapLayer(mapLayer, { force: true }));
        layer.on('filtertokenchange', () => this.updateMapLayer(mapLayer, { force: true }));
      });
    }
    ///
  }

  /** Methos to register and unregister map loadmap
   *
   * */
  registerMapLayerLoadingEvents(mapLayer) {
    mapLayer.on('loadstart', this._incrementLoaders);
    mapLayer.on('loadend', this._decrementLoaders);
    mapLayer.on('loaderror', this._mapLayerLoadError);
  }

  unregisterMapLayerLoadingEvents(mapLayer) {
    mapLayer.off('loadstart', this._incrementLoaders);
    mapLayer.off('loadend', this._decrementLoaders);
    mapLayer.off('loaderror', this._mapLayerLoadError);
  }

  /**
   * End
   */

  // unregister listeners of mapLayers creation
  unregisterMapLayerListeners(mapLayer, projectLayer = false) {
    this.unregisterMapLayerLoadingEvents(mapLayer);
    // try to remove layer filter token
    if (projectLayer && mapLayer.layers && Array.isArray(mapLayer.layers)) {
      mapLayer.layers.forEach((layer) => {
        layer.un('change');
        layer.removeEvent('filtertokenchange');
      });
    }
  }

  setTarget(elId) {
    this.target = elId;
  }

  getCurrentToggledMapControl() {
    const mapControl = this._mapControls.find(({ control }) => control && control.isToggled && control.isToggled());
    return mapControl && mapControl.control;
  }

  /**
   * close: param to close eventually right content open
   * @param interaction
   * @param options is an object contain: {
   *   active: If set new interaction active or not
   *   active: If set new interaction active or not
   *   close: if close eventually GUI Content (es. result right content )
   * }
   * return object having current toggled control if there is a toggled mapcontrol
   */
  addInteraction(interaction, options = { active: true, close: true }) {
    const { active = true } = options;
    const control = this.getCurrentToggledMapControl();
    const toggled = control && control.isToggled && control.isToggled() || false;
    const untoggleMapControls = control && control.isClickMap ? control.isClickMap() : true;
    untoggleMapControls && active && this._unToggleControls(options);
    this.getMap().addInteraction(interaction);
    interaction.setActive(active);
    this._externalInteractions.push(interaction);
    return {
      control,
      toggled, // return current toggled map control if toggled
    };
  }

  removeInteraction(interaction) {
    interaction && interaction.setActive(false);
    this.viewer.map.removeInteraction(interaction);
    this._externalInteractions = this._externalInteractions.filter((_interaction) => interaction !== _interaction);
  }

  _watchInteraction(interaction) {
    interaction.on('change:active', (e) => {
      if ((e.target instanceof Pointer) && e.target.getActive()) {
        this.fire('mapcontrol:active', e.target);
      }
    });
  }

  /**
   * Show map Info
   * @param info
   */
  showMapInfo({ info, style } = {}) {
    this.state.map_info.info = info;
    this.state.map_info.style = style || this.state.map_info.style;
  }

  hideMapInfo() {
    this.state.map_info.info = null;
    this.state.map_info.style = null;
  }

  zoomTo(coordinate, zoom = 6) {
    this.viewer.zoomTo(coordinate, zoom);
  }

  goTo(coordinates, zoom) {
    const options = {
      zoom: zoom || 6,
    };
    this.viewer.goTo(coordinates, options);
  }

  goToRes(coordinates, resolution) {
    this.viewer.goToRes(coordinates, {
      resolution,
    });
  }

  getGeometryAndExtentFromFeatures(features = []) {
    let extent;
    let geometryType;
    let geometry;
    let coordinates;
    let geometryCoordinates = [];
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      const geometry = feature.getGeometry ? feature.getGeometry() : feature.geometry;
      if (geometry) {
        if (geometry instanceof Geometry) {
          const featureExtent = [...geometry.getExtent()];
          extent = !extent ? featureExtent : extend(extent, featureExtent);
          geometryType = geometryType || geometry.getType();
          coordinates = geometry.getCoordinates();
          if (geometryType.includes('Multi')) geometryCoordinates = [...geometryCoordinates, ...coordinates];
          else geometryCoordinates.push(coordinates);
        } else {
          const featureExtent = feature.bbox;
          extent = !extent ? featureExtent : extend(extent, featureExtent);
          geometryType = geometry.type;
          coordinates = geometry.coordinates;
        }
        if (geometryType.includes('Multi')) geometryCoordinates = [...geometryCoordinates, ...coordinates];
        else geometryCoordinates.push(coordinates);
      }
    }
    try {
      const olClassGeomType = geometryType.includes('Multi') ? geometryType : `Multi${geometryType}`;
      geometry = new geom[olClassGeomType](geometryCoordinates);
      if (extent === undefined) extent = geometry.getExtent();
    } catch (err) {}
    return {
      extent,
      geometry,
    };
  }

  highlightFeatures(features, options = {}) {
    const { geometry } = this.getGeometryAndExtentFromFeatures(features);
    // force zoom false
    options.zoom = false;
    this.highlightGeometry(geometry, options);
  }

  /**
   * Zoom methods
   */

  zoomToGeometry(geometry, options = { highlight: false }) {
    const extent = geometry && geometry.getExtent();
    const { highlight } = options;
    if (highlight && extent) options.highLightGeometry = geometry;
    extent && this.zoomToExtent(extent, options);
  }

  zoomToFeatures(features, options = { highlight: false }) {
    const { geometry, extent } = this.getGeometryAndExtentFromFeatures(features);
    const { highlight } = options;
    if (highlight && extent) options.highLightGeometry = geometry;
    extent && this.zoomToExtent(extent, options);
  }

  zoomToExtent(extent, options = {}) {
    const center = getCenter(extent);
    const resolution = this.getResolutionForZoomToExtent(extent);
    this.goToRes(center, resolution);
    options.highLightGeometry && this.highlightGeometry(options.highLightGeometry, {
      zoom: false,
      duration: options.duration,
    });
  }

  zoomToProjectInitExtent() {
    this.zoomToExtent(this.project.state.initextent);
  }

  /**
   * End zoom methods
   */

  compareExtentWithProjectMaxExtent(extent) {
    const projectExtent = this.project.state.extent;
    const inside = containsExtent(projectExtent, extent);
    return inside ? extent : projectExtent;
  }

  getResolutionForZoomToExtent(extent) {
    let resolution;
    const { ZOOM } = MAP_SETTINGS;
    const map = this.getMap();
    const projectExtent = this.project.state.extent;
    const projectMaxResolution = map.getView().getResolutionForExtent(projectExtent, map.getSize());
    const inside = containsExtent(projectExtent, extent);
    // max resolution of the map
    const maxResolution = g3wolutils.getResolutionFromScale(ZOOM.maxScale, this.getMapUnits()); // map resolution of the map
    // check if
    if (inside) {
      // calculate main resolutions
      const currentResolution = map.getView().getResolution(); // Current Resolution
      const extentResolution = map.getView().getResolutionForExtent(extent, map.getSize()); // resolution of request extent
      /// /
      // set the final resolution to go to
      resolution = extentResolution > maxResolution ? extentResolution : maxResolution;
      resolution = (currentResolution < resolution) && (currentResolution > extentResolution) ? currentResolution : resolution;
    } else resolution = projectMaxResolution; // set max resolution
    return resolution;
  }

  goToBBox(bbox, epsg = this.getEpsg()) {
    bbox = epsg === this.getEpsg() ? bbox : transformExtent(bbox, epsg, this.getEpsg());
    this.viewer.fit(this.compareExtentWithProjectMaxExtent(bbox));
  }

  goToWGS84(coordinates, zoom) {
    coordinates = transform(coordinates, 'EPSG:4326', this.project.state.crs.epsg);
    this.goTo(coordinates, zoom);
  }

  extentToWGS84(extent) {
    return transformExtent(extent, this.project.state.crs.epsg, 'EPSG:4326');
  }

  getResolutionForMeters(meters) {
    const viewport = this.viewer.map.getViewport();
    return meters / Math.max(viewport.clientWidth, viewport.clientHeight);
  }

  /*
  * geometries = array of geometries
  * action: add, clear, remove :
  *                             add: feature/features to selectionLayer. If selectionLayer doesn't exist create a  new vector layer.
  *                             clear: remove selectionLayer
  *                             remove: remove feature from selectionlayer. If no more feature are in selectionLayer it will be removed
  * */
  setSelectionFeatures(action = 'add', options = {}) {
    const { feature, color } = options;
    color && this.setDefaultLayerStyle('selectionLayer', { color });
    const source = this.defaultsLayers.selectionLayer.getSource();
    switch (action) {
      case 'add':
        source.addFeature(feature);
        break;
      case 'remove':
        source.removeFeature(feature);
        break;
      case 'update':
        const id = feature.getId();
        const addedFeature = source.getFeatureById(id);
        addedFeature.setGeometry(feature.getGeometry());
        break;
      case 'clear':
        source.clear();
        break;
    }
  }

  clearSelectionFeatures() {
    this.defaultsLayers.selectionLayer.getSource().clear();
  }

  seSelectionLayerVisible(visible = true) {
    this.defaultsLayers.selectionLayer.setVisible(visible);
  }

  highlightGeometry(geometryObj, options = {}) {
    return new Promise((resolve, reject) => {
      const { color } = options;
      this.clearHighlightGeometry();
      this.setDefaultLayerStyle('highlightLayer', {
        color,
      });
      const zoom = (typeof options.zoom === 'boolean') ? options.zoom : true;
      let { hide } = options;
      if (hide) hide = typeof hide === 'function' ? hide : null;
      const customStyle = options.style;
      const defaultStyle = function (feature) {
        const styles = [];
        const geometryType = feature.getGeometry().getType();
        const style = geoutils.createSelectedStyle({
          geometryType,
          color,
          fill: false,
        });
        styles.push(style);
        return styles;
      };
      const { ANIMATION } = MAP_SETTINGS;
      const highlight = (typeof options.highlight === 'boolean') ? options.highlight : true;
      const duration = options.duration || ANIMATION.duration;
      let geometry;
      if (geometryObj instanceof Geometry) geometry = geometryObj;
      else {
        const format = new GeoJSON();
        geometry = format.readGeometry(geometryObj);
      }
      if (zoom) {
        const extent = geometry.getExtent();
        this.zoomToExtent(extent);
      }
      if (highlight) {
        const feature = new Feature({
          geometry,
        });
        const { highlightLayer } = this.defaultsLayers;
        customStyle && highlightLayer.setStyle(customStyle);
        highlightLayer.getSource().addFeature(feature);
        if (hide) {
          const callback = () => {
            highlightLayer.getSource().clear();
            customStyle && highlightLayer.setStyle(defaultStyle);
            resolve();
          };
          hide(callback);
        } else if (duration) {
          if (duration !== Infinity) {
            animatingHighlight = true;
            setTimeout(() => {
              highlightLayer.getSource().clear();
              customStyle && highlightLayer.setStyle(defaultStyle);
              animatingHighlight = false;
              resolve();
            }, duration);
          }
        }
      } else resolve();
    });
  }

  clearHighlightGeometry() {
    !animatingHighlight && this.defaultsLayers.highlightLayer.getSource().clear();
    this.resetDefaultLayerStyle('highlightLayer');
  }

  /**
   * Force to referesh map
   * @param options
   */
  refreshMap(options = { force: true }) {
    this.updateMapLayers(options);
  }

  // called when layout (window) resize
  layout({ width, height }) {
    const is_hidden = (width <= 0 || height <= 0);
    if (!this.viewer) {
      this.setupViewer(width, height);
      if (this.viewer) {
        this.setupControls();
        this.fire('ready');
      }
    } else if (!is_hidden) {
      this.getMap().updateSize();
      this.state.hidemaps.forEach((hidemap) => hidemap.map.updateSize());
      this._updateMapView();
    }
    this.setHidden(is_hidden);
    this._mapControls.length && this._updateMapControlsLayout({ width, height });
  }

  // remove BaseLayers
  _removeBaseLayers() {
    Object.keys(this.mapBaseLayers).forEach((baseLayerId) => {
      this.viewer.map.removeLayer(this.mapBaseLayers[baseLayerId].getOLLayer());
    });
  }

  // function to remove maplayers
  _removeMapLayers() {
    this.getMapLayers().forEach((mapLayer) => {
      this.unregisterMapLayerListeners(mapLayer);
      this.viewer.map.removeLayer(mapLayer.getOLLayer());
    });
    this._mapLayers = [];
  }

  getMapBBOX() {
    return this.viewer.getBBOX();
  }

  _updateMapView() {
    const bbox = this.viewer.getBBOX();
    const resolution = this.viewer.getResolution();
    const center = this.viewer.getCenter();
    const size = this.getMap().getSize();
    this.updateMapView(bbox, resolution, center, size);
  }

  getMapSize() {
    const { map } = this.viewer;
    return map.getSize();
  }

  setInnerGreyCoverScale(scale) {
    this._drawShadow.scale = scale;
  }

  _resetDrawShadowInner() {
    this._drawShadow = {
      type: 'coordinate',
      outer: [],
      inner: [],
      scale: null,
      rotation: null,
    };
  }

  setInnerGreyCoverBBox(options = {}) {
    const { map } = this.viewer;
    const type = options.type || 'coordinate';
    const inner = options.inner || null;
    const { rotation } = options;
    const { scale } = options;
    let lowerLeftInner;
    let upperRightInner;
    if (inner) {
      switch (type) {
        case 'coordinate':
          lowerLeftInner = map.getPixelFromCoordinate([inner[0], inner[1]]);
          upperRightInner = map.getPixelFromCoordinate([inner[2], inner[3]]);
          break;
        case 'pixel':
          lowerLeftInner = [inner[0], inner[1]];
          upperRightInner = [inner[2], inner[3]];
          break;
      }
      const y_min = lowerLeftInner[1] * DEVICE_PIXEL_RATIO;
      const x_min = lowerLeftInner[0] * DEVICE_PIXEL_RATIO;
      const y_max = upperRightInner[1] * DEVICE_PIXEL_RATIO;
      const x_max = upperRightInner[0] * DEVICE_PIXEL_RATIO;
      this._drawShadow.inner[0] = x_min;
      this._drawShadow.inner[1] = y_min;
      this._drawShadow.inner[2] = x_max;
      this._drawShadow.inner[3] = y_max;
    }
    if (_.isNil(scale)) this._drawShadow.scale = this._drawShadow.scale || 1;
    else this._drawShadow.scale = scale;

    if (_.isNil(rotation)) this._drawShadow.rotation = this._drawShadow.rotation || 0;
    else this._drawShadow.rotation = rotation;

    this._drawShadow.outer && map.render();
  }

  // grey map precompose mapcompose
  startDrawGreyCover(message) {
    // after rendering the layer, restore the canvas context
    const { map } = this.viewer;
    let x_min; let x_max; let y_min; let y_max; let rotation; let
      scale;
    this.stopDrawGreyCover();
    const postrender = evt => {
      const ctx = document.getElementById(evt.target.getTarget()).querySelector('canvas').getContext('2d');
      const size = this.getMap().getSize();
      // Inner polygon,must be counter-clockwise
      const height = size[1] * DEVICE_PIXEL_RATIO;
      const width = size[0] * DEVICE_PIXEL_RATIO;
      this._drawShadow.outer = [0, 0, width, height];
      ctx.restore();
      ctx.beginPath();
      // Outside polygon, must be clockwise
      ctx.moveTo(0, 0);
      ctx.lineTo(width, 0);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.lineTo(0, 0);
      ctx.closePath();
      // end external bbox (map is cover)
      if (this._drawShadow.inner.length) {
        ctx.save();
        x_min = this._drawShadow.inner[0];
        y_min = this._drawShadow.inner[3];
        x_max = this._drawShadow.inner[2];
        y_max = this._drawShadow.inner[1];
        rotation = this._drawShadow.rotation;
        scale = this._drawShadow.scale;
        // Inner polygon,must be counter-clockwise antiorario
        ctx.translate((x_max + x_min) / 2, (y_max + y_min) / 2);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.moveTo(-((x_max - x_min) / 2), ((y_max - y_min) / 2));
        ctx.lineTo(((x_max - x_min) / 2), ((y_max - y_min) / 2));
        ctx.lineTo(((x_max - x_min) / 2), -((y_max - y_min) / 2));
        ctx.lineTo(-((x_max - x_min) / 2), -((y_max - y_min) / 2));
        ctx.lineTo(-((x_max - x_min) / 2), ((y_max - y_min) / 2));
        ctx.closePath();
        // end inner bbox
      }
      ctx.fillStyle = 'rgba(0, 5, 25, 0.40)';
      ctx.fill();
      if (message) {
        ctx.font = 'bold 25px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        const arrayMessages = message.split('\n');
        for (let i = 0; i < arrayMessages.length; i++) {
          ctx.fillText(arrayMessages[i], width / 2, (height / 2) + 30 * i);
        }
        // ctx.fillText(message,width/2, height/2);
      }
      ctx.restore();
    };
    this._greyListenerKey = map.on('postrender', postrender);
  }

  stopDrawGreyCover() {
    const map = this.getMap();
    if (this._greyListenerKey) {
      unByKey(this._greyListenerKey);
      this._greyListenerKey = null;
      this._drawShadow.inner.length && this._resetDrawShadowInner();
    }
    map.render();
  }

  removeExternalLayers() {
    this._externalLayers.forEach((layer) => {
      const name = layer.get('name');
      this.removeExternalLayer(name);
    });
    this._externalLayers = [];
  }

  changeLayerVisibility({ id, visible }) {
    const layer = this.getLayerById(id);
    layer && layer.setVisible(visible);
    this.fire('change-layer-visibility', { id, visible });
  }

  changeLayerOpacity({ id, opacity = 1 } = {}) {
    const layer = this.getLayerById(id);
    layer && layer.setOpacity(opacity);
    this.fire('change-layer-opacity', { id, opacity });
  }

  changeLayerMapPosition({ id, position = MAP_SETTINGS.LAYER_POSITIONS.default }) {
    const layer = this.getLayerById(id);
    switch (position) {
      case 'top':
        layer.setZIndex(this.layersCount);
        break;
      case 'bottom':
        layer.setZIndex(1);
        break;
    }
    this.fire('change-layer-position-map', { id, position });
  }

  /**
   * Remove externla layer
   * @param name
   */
  removeExternalLayer(name) {
    const layer = this.getLayerByName(name);
    const catalogService = GUI.getService('catalog');
    const QueryResultService = GUI.getService('queryresults');
    QueryResultService.unregisterVectorLayer(layer);
    this.viewer.map.removeLayer(layer);
    const type = layer._type || 'vector';
    catalogService.removeExternalLayer({
      name,
      type,
    });
    if (type == 'wms') {
      this._externalMapLayers = this._externalMapLayers.filter((externalMapLayer) => {
        if (externalMapLayer.getId() === layer.id) this.unregisterMapLayerListeners(externalMapLayer, layer.projectLayer);
        return externalMapLayer.getId() !== layer.id;
      });
    }
    this._externalLayers = this._externalLayers.filter((externalLayer) => externalLayer.get('id') !== layer.get('id'));
    this.unloadExternalLayer(layer);
    this.fire('remove-external-layer', name);
  }

  /**
   * Add wms external layer to mapo
   * @param url
   * @param layers
   * @param name
   * @param projection
   * @param position
   * @returns {Promise<unknown>}
   */
  addExternalWMSLayer({
    url, layers, name, epsg = this.getEpsg(), position = MAP_SETTINGS.LAYER_POSITIONS.default, opacity, visible = true,
  } = {}) {
    const projection = get(epsg);
    return new Promise((resolve, reject) => {
      const { wmslayer, olLayer } = geoutils.createWMSLayer({
        name,
        url,
        layers,
        projection,
      });

      wmslayer.once('loadend', () => {
        resolve(wmslayer);
      });

      wmslayer.once('loaderror', (err) => {
        reject(err);
      });

      /**
       * add to map
       */
      this.addExternalLayer(olLayer, {
        position,
        opacity,
        visible,
      });

      /**
       * cal register and other thing to alert that new map layer is added
       */
      this.addExternalMapLayer(wmslayer, false);
    });
  }

  /**
   *
   * Return extanla layers added to map
   * @returns {[]|*[]|T[]}
   */
  getExternalLayers() {
    return this._externalLayers;
  }

  addExternalMapLayer(externalMapLayer, projectLayer = false) {
    this._externalMapLayers.push(externalMapLayer);
    this.registerMapLayerListeners(externalMapLayer, projectLayer);
  }

  /**
   * Method to add external layer to map
   * @param externalLayer
   * @param options
   * @returns {Promise<Promise<*> | Promise<never>>}
   */
  addExternalLayer = async function (externalLayer, options = {}) {
    let vectorLayer;
    let name;
    let data;
    let color;
    let style;
    let type;
    let crs;
    const { position = MAP_SETTINGS.LAYER_POSITIONS.default, opacity = 1, visible = true } = options;
    const { map } = this.viewer;
    const catalogService = GUI.getService('catalog');
    const QueryResultService = GUI.getService('queryresults');
    if (externalLayer instanceof OLVectorLayer) {
      let id = externalLayer.get('id');
      if (id === undefined) {
        id = utils.uniqueId();
        externalLayer.set('id', id);
      }
      vectorLayer = externalLayer;
      let color;
      try {
        const style = externalLayer.getStyle();
        color = style._g3w_options ? style._g3w_options.color : 'blue'; // setted by geo utils create style function
      } catch (err) {
        color = 'blue';
      }
      name = vectorLayer.get('name') || vectorLayer.get('id');
      type = 'vector';
      externalLayer = {
        id,
        name,
        projectLayer: false,
        title: name,
        removable: true,
        external: true,
        crs: options.crs,
        type: options.type,
        _type: type,
        download: options.download || false,
        visible,
        checked: true,
        position,
        opacity,
        color,
      };
    } else if (externalLayer instanceof ImageLayer) {
      type = 'wms';
      name = externalLayer.get('name');
      externalLayer.id = externalLayer.get('id');
      externalLayer.removable = true;
      externalLayer.projectLayer = false;
      externalLayer.name = name;
      externalLayer.title = name;
      externalLayer._type = type;
      externalLayer.opacity = opacity;
      externalLayer.position = position;
      externalLayer.external = true;
      externalLayer.checked = visible;
    } else {
      name = externalLayer.name;
      type = externalLayer.type;
      crs = externalLayer.crs;
      data = externalLayer.data;
      color = externalLayer.color;
    }
    const layer = this.getLayerByName(name);
    const loadExternalLayer = (layer, type) => {
      let extent;
      if (layer) {
        if (type === 'vector') {
          const features = layer.getSource().getFeatures();
          if (features.length) externalLayer.geometryType = features[0].getGeometry().getType();
          extent = layer.getSource().getExtent();
          externalLayer.bbox = {
            minx: extent[0],
            miny: extent[1],
            maxx: extent[2],
            maxy: extent[3],
          };
        }
        layer.set('position', position);
        layer.setOpacity(opacity);
        layer.setVisible(visible);
        map.addLayer(layer);
        this._externalLayers.push(layer);
        QueryResultService.registerVectorLayer(layer);
        catalogService.addExternalLayer({
          layer: externalLayer,
          type,
        });
        extent && map.getView().fit(extent);
        this.loadExternalLayer(layer);
        return Promise.resolve(layer);
      } return Promise.reject();
    };
    if (!layer) {
      switch (type) {
        case 'vector':
          return loadExternalLayer(vectorLayer, type);
          break;
        case 'wms':
          return loadExternalLayer(externalLayer, type);
          break;
        default:
          vectorLayer = await geoutils.createVectorLayerFromFile({
            name, type, crs, mapCrs, data, style,
          });
          return loadExternalLayer(vectorLayer);
      }
      loadExternalLayer(vectorLayer);
    } else GUI.notify.warning('layer_is_added', false);
  };

  setExternalLayerStyle(color, field) {
    color = color.rgba;
    color = `rgba(${color.r},${color.g},${color.b},${color.a})`;
    const defaultStyle = {
      Point: new Style({
        image: new Circle({
          fill: new Fill({
            color,
          }),
          radius: 5,
          stroke: new Stroke({
            color,
            width: 1,
          }),
        }),
      }),
      LineString: new Style({
        stroke: new Stroke({
          color,
          width: 3,
        }),
      }),
      Polygon: new Style({
        fill: new Fill({
          color: 'rgba(255,255,255,0.5)',
        }),
        stroke: new Stroke({
          color,
          width: 3,
        }),
      }),
      MultiPoint: new Style({
        image: new Circle({
          fill: new Fill({
            color,
          }),
          radius: 5,
          stroke: new Stroke({
            color,
            width: 1,
          }),
        }),
      }),
      MultiLineString: new Style({
        stroke: new Stroke({
          color,
          width: 3,
        }),
      }),
      MultiPolygon: new Style({
        fill: new Fill({
          color: 'rgba(255,255,255,0.5)',
        }),
        stroke: new Stroke({
          color,
          width: 3,
        }),
      }),
    };
    const styleFunction = function (feature, resolution) {
      const featureStyleFunction = feature.getStyleFunction();
      return featureStyleFunction ? featureStyleFunction.call(feature, resolution) : defaultStyle[feature.getGeometry().getType()];
    };
    return styleFunction;
  }
}

export default MapService;
