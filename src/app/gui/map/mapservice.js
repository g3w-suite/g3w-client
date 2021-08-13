import {G3W_FID} from 'constant';
const t = require('core/i18n/i18n.service').t;
const {inherit, base, copyUrl, uniqueId, debounce, throttle, toRawType} = require('core/utils/utils');
const G3WObject = require('core/g3wobject');
const {
  createVectorLayerFromFile,
  createSelectedStyle,
  getMapLayersByFilter} = require('core/utils/geo');
const DataRouterService = require('core/data/routerservice');
const GUI = require('gui/gui');
const ApplicationService = require('core/applicationservice');
const ProjectsRegistry = require('core/project/projectsregistry');
const MapLayersStoreRegistry = require('core/map/maplayersstoresregistry');
const WFSProvider = require('core/layers/providers/wfsprovider');
const olhelpers = require('g3w-ol/src/g3w.ol').helpers;
const {getScaleFromResolution, getResolutionFromScale} = require('g3w-ol/src/utils/utils');
const ControlsFactory = require('gui/map/control/factory');
const StreetViewService = require('gui/streetview/streetviewservice');
const ControlsRegistry = require('gui/map/control/registry');
const VectorLayer = require('core/layers/vectorlayer');
const SETTINGS = {
  zoom : {
    maxScale: 2000,
  },
  animation: {
    duration: 2000
  }
};

function MapService(options={}) {
  this.id = 'MapService';
  this.viewer = null;
  this.target = options.target || null;
  this.maps_container = options.maps_container || null;
  this._layersStoresEventKeys = {};
  this._keyEvents = {
    ol: [],
    g3wobject: [],
    eventemitter: []
  };
  this.project = null;
  this._mapControls = [];
  this._changeMapMapControls = [];
  this._mapLayers = [];
  this._externalLayers = [];
  this.mapBaseLayers = {};
  this.defaultsLayers = {
    _style: {
      highlightLayer: {
        color: undefined
      },
      selectionLayer: {
        color: 'red'
      }
    },
    highlightLayer:new ol.layer.Vector({
      source: new ol.source.Vector(),
      style:(feature) => {
        let styles = [];
        const geometryType = feature.getGeometry().getType();
        const style = createSelectedStyle({
          geometryType,
          color: this.defaultsLayers._style.highlightLayer.color
        });
        styles.push(style);
        return styles;
      }
    }),
    selectionLayer:new ol.layer.Vector({
      source: new ol.source.Vector(),
      style: feature => {
        let styles = [];
        const geometryType = feature.getGeometry().getType();
        const style = createSelectedStyle({
          geometryType,
          color:this.defaultsLayers._style.selectionLayer.color,
          fill: false
        });
        styles.push(style);
        return styles;
      }
    })
  };
  this.layersExtraParams = {};
  this.state = {
    mapUnits: 'm',
    bbox: [],
    hidemaps:[],
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
      minHeight: 47
    },
    mapControl: {
      grid: [],
      length: 0,
      currentIndex: 0,
      update: true,
      disabled: false
    },
  };

  this._greyListenerKey = null;
  this._drawShadow = {
    type: 'coordinate',
    outer: [],
    inner: [],
    scale: null,
    rotation: null
  };
  this.config = options.config || ApplicationService.getConfig();
  this._howManyAreLoading = 0;
  this._layersLoadingError = false;
  // function to show spinner layers
  this._incrementLoaders = () => {
    if (this._howManyAreLoading === 0) {
      this.emit('loadstart');
      GUI.showSpinner({
        container: $('#map-spinner'),
        id: 'maploadspinner',
        style: 'transparent'
      });
    }
    this._howManyAreLoading += 1;
  };

  this._decrementLoaders = () => {
    this._howManyAreLoading -= 1;
    if (this._howManyAreLoading === 0){
      this.emit('loadend');
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
    //on after setting current project
    const keysetCurrentProject = ProjectsRegistry.onafter('setCurrentProject', project => {
      this.removeLayers();
      this._removeListeners();
      // check if reload same project
      const isSameProject = this.project.getId() === project.getId();
      this.project = project;
      const changeProjectCallBack = () => {
        this._resetView();
        this._setupBaseLayers();
        this._setupMapLayers();
        this._setupVectorLayers();
        this._checkMapControls();
        this.setUpMapOlEvents();
        this.setupCustomMapParamsToLegendUrl();
      };
      ApplicationService.isIframe() && changeProjectCallBack();
      isSameProject ? changeProjectCallBack() : this.getMap().once('change:size', changeProjectCallBack);
    });
    this._keyEvents.g3wobject.push({
      who: ProjectsRegistry,
      setter : 'setCurrentProject',
      key: keysetCurrentProject
    });
  }
  this._setupListeners();
  this._marker = null;
  this._bboxLayer = new ol.layer.Vector({
    source: new ol.source.Vector({})
  });
  this.debounces =  {
    setupCustomMapParamsToLegendUrl: {
      fnc: (...args) => {
        this._setupCustomMapParamsToLegendUrl(...args)
      },
      delay: 1000
    }
  };
  this.setters = {
    setupControls(){
      return this._setupControls()
    },
    addHideMap({ratio, layers=[], mainview=false, switchable=false} = {}) {
      const id = `hidemap_${Date.now()}`;
      const idMap = {
        id,
        map: null,
        switchable
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
    setupViewer(width,height) {
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
      this.emit('viewerset');
    },
    controlClick(active) {}
  };

  this._onCatalogSelectLayer = function(layer) {
    if (layer) {
      const geometryType  = layer.getGeometryType();
      const querable = layer.isQueryable();
      for (let i = 0; i < this._mapControls.length; i++) {
        const mapcontrol = this._mapControls[i];
        if (mapcontrol.control._onSelectLayer) {
          if (mapcontrol.control.getGeometryTypes().indexOf(geometryType) !== -1) {
            mapcontrol.control.setEnable(querable? layer.isVisible(): querable);
            // listen changes
            querable && this.on('cataloglayertoggled', _toggledLayer => {
              if (layer === _toggledLayer) mapcontrol.control.setEnable(layer.isVisible())
            })
          } else mapcontrol.control.setEnable(false)
        }
      }
    }
  };

  this.on('cataloglayerselected', this._onCatalogSelectLayer);

  this._keyEvents.eventemitter.push({
    event: 'cataloglayerselected',
    listener: this._onCatalogSelectLayer
  });

  this._onCatalogUnSelectLayer = function() {
    for (let i = 0; i< this._mapControls.length; i++) {
      const mapcontrol = this._mapControls[i];
      mapcontrol.control._onSelectLayer && mapcontrol.control.setEnable(false);
      this.removeAllListeners('cataloglayertoggled')
    }
  };

  this.on('cataloglayerunselected', this._onCatalogUnSelectLayer);

  this._keyEvents.eventemitter.push({
    event: 'cataloglayerunselected',
    listener: this._onCatalogUnSelectLayer
  });

  const extraParamsSet = (extraParams, update) => {
    update && this.getMapLayers().forEach(mapLayer => {
      mapLayer.update(this.state, extraParams);
    })
  };

  this.on('extraParamsSet', extraParamsSet);

  this._keyEvents.eventemitter.push({
    event: 'extraParamsSet',
    listener: extraParamsSet
  });

  this.once('viewerset', ()=> {
    //CHECK IF MAPLAYESRSTOREREGISTRY HAS LAYERSTORE
    MapLayersStoreRegistry.getLayersStores().forEach(layersStore => {
      this._setUpEventsKeysToLayersStore(layersStore);
    });
    // LISTEN ON EVERY ADDED LAYERSSTORE
    MapLayersStoreRegistry.onafter('addLayersStore', layersStore => {
      this._setUpEventsKeysToLayersStore(layersStore);
    });
    // LISTENER ON REMOVE LAYERSTORE
    MapLayersStoreRegistry.onafter('removeLayersStore', layerStore => {
      this._removeEventsKeysToLayersStore(layerStore);
    });
  });

  base(this);
}

inherit(MapService, G3WObject);

const proto = MapService.prototype;

proto.setUpMapOlEvents = function(){
  const dynamicLegend = this.project.getContextBaseLegend();
  // set change resolution
  this._keyEvents.ol.forEach(keyEvent => ol.Observable.unByKey(keyEvent));
  const keyolchangeresolution = this.viewer.map.getView().on("change:resolution", evt => {
    this._updateMapView();
    dynamicLegend && this.setupCustomMapParamsToLegendUrl();
  });
  this._keyEvents.ol.push(keyolchangeresolution);
  if (dynamicLegend) {
    const keyolmoveeend = this.viewer.map.on("moveend", evt => this.setupCustomMapParamsToLegendUrl());
    this._keyEvents.ol.push(keyolmoveeend);
  } else this.setupCustomMapParamsToLegendUrl(false);
};

//clear methods to remove all listeners events
proto.clear = function() {
  Object.keys(this._keyEvents).forEach(type => {
    switch(type) {
      case 'ol':
        this._keyEvents[type].forEach(keyEvent => ol.Observable.unByKey(keyEvent));
        break;
      case 'g3wobject':
        this._keyEvents[type].forEach(eventObject => {
          const {who, setter, key} = eventObject;
          who.un(setter, key);
        });
        break;
      case 'eventemitter':
        this._keyEvents[type].forEach(eventObject => {
          const {event, listener } = eventObject;
          this.removeListener(event, listener);
        });
        break;
    }
  });
  this._keyEvents = null;
  MapLayersStoreRegistry.getLayersStores().forEach(layerStore => {
    this._removeEventsKeysToLayersStore(layerStore);
  })
};

proto.showMapSpinner = function(){
  GUI.showSpinner({
    container: $('#map-spinner'),
    id: 'maploadspinner',
    style: 'transparent'
  });
};

proto.hideMapSpinner = function(){
  GUI.hideSpinner('maploadspinner')
};

proto.getScaleFromExtent = function(extent) {
  const resolution = this.getMap().getView().getResolutionForExtent(extent, this.getMap().getSize());
  const scale = getScaleFromResolution(resolution, this.getMapUnits());
  return scale;
};

proto._addHideMap = function({ratio, layers=[], mainview=false} = {}) {
  const idMap = this.state.hidemaps[this.state.hidemaps.length - 1 ];
  const view = this.getMap().getView();
  const view_options = {
    projection: view.getProjection(),
    center: view.getCenter(),
    resolution: this.getResolution()
  };
  const viewer = olhelpers.createViewer({
    id: idMap.id,
    view: mainview ? view: view_options
  });
  // set Map
  idMap.map = viewer.getMap();
  // in case of rate
  if (ratio) {
    const [width, height] = idMap.map.getSize();
    idMap.map.setSize([width, width*ratio]);
  }

  for (let i=0; i < layers.length; i++) {
    const layer = layers[i];
    idMap.map.addLayer(layer);
  }
  return idMap.map;
};

proto.removeHideMap = function(id) {
  let index;
  for (let i = 0; i < this.state.hidemaps.length; i++) {
    if (id === this.state.hidemaps[i].id){
      index = i;
      break;
    }
  }
  index !== undefined && this.state.hidemaps.splice(index,1);
};

proto._showHideMapElement = function({map, show=false} = {}) {
  show ? $(map.getTargetElement()).addClass('show') : $(map.getTargetElement()).removeClass('show');
};

proto.createMapImage = function({map, background} = {}) {
  return new Promise((resolve, reject) => {
    try {
      const canvas = this.getMapCanvas(map);
      if (navigator.msSaveBlob) resolve(canvas.msToBlob());
      else canvas.toBlob(blob => resolve(blob));
    } catch (err) {
      reject(err);
    }
  })
};

proto.getApplicationAttribution = function() {
  const {header_terms_of_use_link, header_terms_of_use_text} = this.config.group;
  if (header_terms_of_use_text) {
    return header_terms_of_use_link ? `<a href="${header_terms_of_use_link}">${header_terms_of_use_text}</a>` : `<span class="skin-color" style="font-weight: bold">${header_terms_of_use_text}</span>`;
  } else return false
};

proto.slaveOf = function(mapService, sameLayers) {
  sameLayers = sameLayers || false;
};

proto.setLayersExtraParams = function(params,update){
  this.layersExtraParams = _.assign(this.layersExtraParams, params);
  this.emit('extraParamsSet',params,update);
};

proto.getProject = function() {
  return this.project;
};

proto.getMap = function() {
  try {
    return this.viewer.map;
  } catch(err) {}
};

proto.getMapCanvas = function(map) {
  const viewport = map ? map.getViewport() : $(`#${this.maps_container} .g3w-map`).last().children('.ol-viewport')[0];
  return $(viewport).children('canvas')[0];
};

proto.getProjection = function() {
  return this.project.getProjection();
};

proto.isMapHidden = function(){
  return this.state.hidden;
};

proto.isAxisOrientationInverted = function() {
  return this.getProjection().getAxisOrientation() === 'neu' ? true : false;
};

proto.getCrs = function() {
  return this.getProjection().getCode();
};

proto.getViewerElement = function(){
  return this.viewer.map.getTargetElement();
};

proto.getViewport = function(){
  return this.viewer.map.getViewport();
};

proto.getResolution = function() {
  return this.viewer.map.getView().getResolution();
};

proto.getEpsg = function() {
  return this.viewer.map.getView().getProjection().getCode();
};

proto.getGetFeatureInfoUrlForLayer = function(layer, coordinates, resolution, epsg, params) {
  const mapLayer = this.getMapLayerForLayer(layer);
  return mapLayer.getGetFeatureInfoUrl(coordinates,resolution,epsg,params);
};

/**
 * Show Marker on map
 * @param coordinates
 * @param duration
 */
proto.showMarker = function(coordinates, duration=1000) {
  this._marker.setPosition(coordinates);
  setTimeout(() => this._marker.setPosition(), duration);
};

// return layer by name
proto.getLayerByName = function(name) {
  const layer = this.getMap().getLayers().getArray().find(lyr => {
    const layerName = lyr.get('name');
    return layerName && layerName === name;
  });
  return layer;
};

// return layer by id
proto.getLayerById = function(id) {
  return this.getMap().getLayers().getArray().find(layer => layer.get('id') === id);
};

// method do get all feature from vector layer based on coordinates
proto.getVectorLayerFeaturesFromCoordinates = function(layerId, coordinates) {
  let intersectGeom;
  let features = [];
  const map = this.getMap();
  const vectorLayer = this.getLayerById(layerId);
  if (Array.isArray(coordinates)) {
    if (coordinates.length === 2) {
      const pixel = map.getPixelFromCoordinate(coordinates);
      map.forEachFeatureAtPixel(pixel,
        feature => features.push(feature),
        {layerFilter(layer) {return layer === vectorLayer;}
      });
    } else if (coordinates.length === 4) {
      intersectGeom = ol.geom.Polygon.fromExtent(coordinates);
      switch (vectorLayer.constructor) {
        case VectorLayer:
          features = vectorLayer.getIntersectedFeatures(intersectGeom);
          break;
        case ol.layer.Vector:
          vectorLayer.getSource().getFeatures().forEach(feature => {
            intersectGeom.intersectsExtent(feature.getGeometry().getExtent()) && features.push(feature);
          });
          break;
      }
    }
  } else if (coordinates instanceof ol.geom.Polygon || coordinates instanceof ol.geom.MultiPolygon) {
    intersectGeom = coordinates;
    switch (vectorLayer.constructor) {
      case VectorLayer:
        features = vectorLayer.getIntersectedFeatures(intersectGeom);
        break;
      case ol.layer.Vector:
        vectorLayer.getSource().getFeatures().forEach(feature => {
          intersectGeom.intersectsExtent(feature.getGeometry().getExtent()) && features.push(feature);
        });
        break;
    }
  }
  return features;
};

proto.getQueryLayerByCoordinates = function({layer, coordinates} = {}) {
  const mapProjection = this.getProjection();
  const resolution = this.getResolution();
  return new Promise((resolve, reject) => {
    layer.query({
      coordinates,
      mapProjection,
      resolution
    }).then((response) => resolve(response))
      .fail(err => reject(err))
  })
};

proto.getQueryLayerPromiseByCoordinates = function({layer, coordinates} = {}) {
  return new Promise((resolve, reject) => {
    const mapProjection = this.getProjection();
    const resolution = this.getResolution();
    layer.query({
      coordinates,
      mapProjection,
      resolution
    }).then((response) => {
      resolve(response)
    }).fail((error)=> {
      reject(error);
    })
  })
};

//setup controls
/*
  layout : {
    lv: <options> h : horizontal (default), v vertical
    lh: <options> h: horizontal: v vertical (default)
  }
 */

proto.activeMapControl = function(controlName) {
  const mapControl = this._mapControls.find(control => control.type === controlName);
  const control = mapControl.control;
  !control.isToggled() ? control.toggle() : null;
};

proto.createMapControl = function(type, {id, add=true, toggled=false, visible, options={}}={}) {
  id = id || type;
  const control = ControlsFactory.create({
    type,
    toggled,
    ...options
  });
  visible = visible === undefined ? (control.isVisible ? control.isVisible() : true) : visible;
  control && this.addControl(id, type, control, add, visible);
  return control;
};

proto.showAddLayerModal = function() {
  this.emit('addexternallayer');
};

proto._checkMapControls = function(){
  this._changeMapMapControls.forEach(({control, getVisible=()=>{return true}}) =>{
    this._setMapControlVisible({
      control,
      visible: getVisible()
    })
  })
};

proto._setupControls = function() {
  const baseLayers = getMapLayersByFilter({
    BASELAYER: true
  });
  this.getMapLayers().forEach(mapLayer => mapLayer.getSource().setAttributions(this.getApplicationAttribution()));
  // check if base layer is set. If true add attribution control
  if (this.getApplicationAttribution() || baseLayers.length) {
    const attributionControl = new ol.control.Attribution({
      collapsible: false,
      target: 'map_footer_left'
    });
    this.getMap().addControl(attributionControl);
  }

  if (this.config && this.config.mapcontrols) {
    const mapcontrols = this.config.mapcontrols;
    const feature_count = this.project.getQueryFeatureCount();
    const map = this.getMap();
    mapcontrols.forEach(controlType => {
      let control;
      // mapcontroc can be a String or object with options
      controlType = toRawType(controlType) === 'String' ? controlType : controlType.name;
      switch (controlType) {
        case 'reset':
          if (!isMobile.any) {
            control = ControlsFactory.create({
              type: controlType
            });
          }
          this.addControl(controlType, control, false);
          break;
        case 'zoom':
          control = this.createMapControl(controlType, {
            options: {
              zoomInLabel: "\ue98a",
              zoomOutLabel: "\ue98b"
            }
          });
          break;
        case 'zoombox':
          if (!isMobile.any) {
            control = this.createMapControl(controlType, {});
            control.on('zoomend', (e) => {
              this.viewer.fit(e.extent);
            });
          }
          break;
        case 'zoomtoextent':
          control = this.createMapControl(controlType, {
            options: {
              label: "\ue98c",
              extent: this.project.state.initextent
            }
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
                  return ol.coordinate.format(coordinate, `\u00A0${coordinateLabels[0]}: {x}, ${coordinateLabels[1]}: {y}\u00A0\u00A0 [${crs}]\u00A0`, 4);
                },
                undefinedHTML: false,
                projection: this.getCrs()
              }
            });
          }
          break;
        case 'screenshot':
          //check if wms externl is on map. CORS PROBLEM
          const findWmsExternal = this.getMapLayers().find(({layers=[]}) => {
            return !!layers.find(layer => layer.isExternalWMS ? layer.isExternalWMS() : false)
          });
          if (!isMobile.any && !findWmsExternal) {
            control = this.createMapControl(controlType, {
              options: {
                onclick: async () => {
                  try {
                    const blobImage = await this.createMapImage();
                    saveAs(blobImage, `map_${Date.now()}.png`);
                  } catch (e) {
                    GUI.showUserMessage({
                      type: 'alert',
                      message: t("mapcontrols.screenshot.error"),
                      autoclose: true
                    })
                  }
                  return true;
                }
              }
            });
          }
          break;
        case 'scale':
          control = this.createMapControl(controlType, {
            add: false,
            options: {
              coordinateFormat: ol.coordinate.createStringXY(4),
              projection: this.getCrs(),
              isMobile: isMobile.any
            }
          });
          break;
        case 'query':
          control = this.createMapControl(controlType, {
            add: true,
            toggled: true
          });
          const runQuery = throttle(async e => {
            const coordinates = e.coordinates;
            GUI.closeOpenSideBarComponent();
            try {
              const {data=[]} = await DataRouterService.getData('query:coordinates', {
                inputs: {
                  coordinates,
                  feature_count,
                  multilayers: this.project.isQueryMultiLayers(controlType),
                }
              });
              data.length && this.showMarker(coordinates);
            } catch(error) {}
          });
          const eventKey = control.on('picked', runQuery);
          control.setEventKey({
            eventType: 'picked',
            eventKey
          });
          break;
        case 'querybypolygon':
          if (!isMobile.any) {
            const condition = {
              filtrable: {
                ows: 'WFS'
              }
            };
            const getControlLayers = () => {
              const controlQuerableLayers = getMapLayersByFilter({
                QUERYABLE: true,
                SELECTEDORALL: true
              });
              const controlFiltrableLayers = getMapLayersByFilter({
                FILTERABLE: true,
                SELECTEDORALL: true
              }, condition);
              return [... new Set([...controlFiltrableLayers, ...controlQuerableLayers])];
            };
            control = this.createMapControl(controlType, {
              options: {
                layers: getControlLayers(),
                help: "sdk.mapcontrols.querybypolygon.help"
              }
            });
            if (control) {
              this._changeMapMapControls.push({
                control,
                getVisible: () => {
                  const controlLayers = getControlLayers();
                  return control.checkVisibile(controlLayers);
                }
              });

              const runQuery = throttle(async e => {
                GUI.closeOpenSideBarComponent();
                const coordinates = e.coordinates;
                // ask for coordinates
                try {
                 const {data:dataCoordinates=[]} = await DataRouterService.getData('query:coordinates', {
                    inputs: {
                      feature_count,
                      coordinates
                    },
                   outputs: {
                      show({data=[], query}){
                        const show = data.length === 0;
                        // set coordinates to null to avoid that externalvector added to query result
                        // response to coordinates
                        query.coordinates = !show && null;
                        return show;
                      }
                   }
                  });
                  if (dataCoordinates.length && dataCoordinates[0].features.length) {
                    const feature = dataCoordinates[0].features[0];
                    const fid = feature.get(G3W_FID);
                    const geometry = feature.getGeometry();
                    const excludeLayers = [dataCoordinates[0].layer];
                    const {data=[]} = await DataRouterService.getData('query:polygon', {
                      inputs: {
                        excludeLayers,
                        geometry,
                        fid,
                        filterConfig:{
                          spatialMethod: control.getSpatialMethod() // added spatial method to polygon filter
                        },
                        multilayers: this.project.isQueryMultiLayers(controlType)
                      },
                      outputs: {
                        show({error=false}){
                          return !error;
                        }
                      }
                    });
                    data.length && map.getView().setCenter(coordinates);
                  }
                } catch(err){}
              });
              const eventKey = control.on('picked', runQuery);
              control.setEventKey({
                eventType: 'picked',
                eventKey
              });
            }
          }
          break;
        case 'querybbox':
          if (!isMobile.any) {
            const condition = {
              filtrable: {
                ows: 'WFS'
              }
            };
            const getControlLayers = ()=>{
              const layers = this.filterableLayersAvailable() ? getMapLayersByFilter({
                SELECTEDORALL: true,
                FILTERABLE: true
              }, condition) : [];
              layers.forEach(layer => layer.setTocHighlightable(true));
              return layers;
            };
            let controlLayers = getControlLayers();
            control = this.createMapControl(controlType, {
              options: {
                layers: controlLayers,
                help: "sdk.mapcontrols.querybybbox.help"
              }
            });
            if (control) {
              this._changeMapMapControls.push({
                control,
                getVisible: () => {
                  controlLayers = getControlLayers();
                  return control.checkVisible(controlLayers);
                }
              });
              const layersFilterObject = {
                SELECTEDORALL: true,
                FILTERABLE: true,
                VISIBLE: true
              };
              control.on('toggled', evt => {
                if (evt.target.isToggled()) {
                  const layers = getMapLayersByFilter(layersFilterObject, condition);
                  if (layers.length === 0) {
                    GUI.showUserMessage({
                      type: "warning",
                      message: 'sdk.mapcontrols.querybybbox.nolayers_visible'
                    });
                    control.toggle();
                  }
                }
              });

              const runQuery = throttle(async e => {
                GUI.closeOpenSideBarComponent();
                const bbox = e.extent;
                try {
                  const {data=[]} = await DataRouterService.getData('query:bbox', {
                    inputs: {
                      bbox,
                      feature_count,
                      layersFilterObject,
                      condition,
                      multilayers: this.project.isQueryMultiLayers(controlType)
                    }
                  });
                  if (data.length) {
                    const center = ol.extent.getCenter(bbox);
                    this.getMap().getView().setCenter(center);
                  }
                } catch(err){}
              });
              const eventKey = control.on('bboxend', runQuery);
              control.setEventKey({
                eventType: 'bboxend',
                eventKey
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
            .then(()=> {
              control.setProjection(this.getProjection());
              this.viewer.map.addLayer(control.getLayer());
              const position = {
                lat: null,
                lng: null
              };
              const closeContentFnc = () => {
                control.clearMarker();
                active = false;
              };
              streetViewService.onafter('postRender', position => control.setPosition(position));
              if (control) {
                this._setMapControlVisible({
                  control,
                  visible: true
                });
                control.on('picked', throttle(e => {
                  GUI.off('closecontent', closeContentFnc);
                  active = true;
                  const coordinates = e.coordinates;
                  const lonlat = ol.proj.transform(coordinates, this.getProjection().getCode(), 'EPSG:4326');
                  position.lat = lonlat[1];
                  position.lng = lonlat[0];
                  streetViewService.showStreetView(position);
                  GUI.on('closecontent', closeContentFnc);
                }));
                control.on('disabled', () => {
                  active && GUI.closeContent();
                  GUI.off('closecontent', closeContentFnc);
                })
              }
            }).catch(() => this.removeControl(controlType));
          break;
        case 'scaleline':
          control = this.createMapControl(controlType, {
            add: false,
            options: {
              position: 'br'
            }
          });
          break;
        case 'overview':
          if (!isMobile.any) {
            if (!this.config.overviewproject) return;
            const overviewProjectGid = this.config.overviewproject.gid;
            if (overviewProjectGid) {
              ProjectsRegistry.getProject(overviewProjectGid)
              .then(project => {
                const overViewMapLayers = this.getOverviewMapLayers(project);
                const viewOptions = this._calculateViewOptions({
                  width: 200, // at monent hardcoded
                  height: 150,
                  project
                });
                const view = new ol.View(viewOptions);
                const mainView = this.getMap().getView();
                view.on('change:center', function(){
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
                    view
                  }
                });
              });
            }
          }
          break;
        case 'nominatim':
          const lonlat = coordinates => {
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
              placeholder: "mapcontrols.nominatim.placeholder",
              noresults: "mapcontrols.nominatim.noresults",
              notresponseserver: "mapcontrols.nominatim.notresponseserver",
              fontIcon: GUI.getFontClass('search')
            }
          });
          control.on('addresschosen', evt => {
            const coordinate = evt.coordinate;
            const geometry =  new ol.geom.Point(coordinate);
            this.highlightGeometry(geometry);
          });

          $('#search_nominatim').click(debounce(() => {
            control.nominatim.query($('input.gcd-txt-input').val());
          }));
          break;
        case 'geolocation':
          control = this.createMapControl(controlType);
          control.on('click', throttle(evt => this.showMarker(evt.coordinates)));
          control.on('error', evt => {
            GUI.showUserMessage({
              type: 'warning',
              message: "mapcontrols.geolocations.error",
              autoclose: true
            })
          });
          break;
        case 'addlayers':
          if (!isMobile.any) {
            control = this.createMapControl(controlType, {});
            control.on('addlayer', () => this.emit('addexternallayer'));
          }
          break;
        case 'length':
          if (!isMobile.any) {
            control = this.createMapControl(controlType, {
              options: {
                tipLabel: 'sdk.mapcontrols.measures.length.tooltip',
                interactionClassOptions: {
                  projection: this.getProjection(),
                  help: 'sdk.mapcontrols.measures.length.help'
                }
              }
            });
          }
          break;
        case 'area':
          if (!isMobile.any) {
            control = this.createMapControl(controlType, {
              options: {
                tipLabel:'sdk.mapcontrols.measures.area.tooltip',
                interactionClassOptions: {
                  projection: this.getProjection(),
                  help: 'sdk.mapcontrols.measures.area.help'
                }
              }
            });
          }
          break;
      }
    });
    return this.getMapControls()
  }
};

proto.getCenter = function(){
  const map = this.getMap();
  return map.getView().getCenter();
};

proto.getMapExtent = function(){
  const map = this.getMap();
  return map.getView().calculateExtent(map.getSize());
};

proto.getMapExtentUrl = function(){
  const url = new URL(location.href);
  const map_extent = this.getMapExtent().toString();
  url.searchParams.set('map_extent', map_extent);
  return url.toString()
};

proto.createCopyMapExtentUrl = function(){
  const url = this.getMapExtentUrl();
  copyUrl(url);
};

proto._setMapControlsGrid = function(length) {
  const grid = this.state.mapControl.grid;
    if (length < 2) {
      const rC = grid[grid.length - 1];
      grid.push({
        rows: rC.rows * 2 ,
        columns: 2
      });
      return;
    }
    if (length === 2) {
      if (grid.length) {
        const rC = grid[grid.length - 1];
        grid.push({
          rows: rC.columns ,
          columns: rC.rows
        })
      } else {
        grid.push({
          rows: 1,
          columns: 2
        })
      }
    } else if (length === 3) {
      const rC = grid[grid.length - 1];
      grid.push({
        rows: 2 * rC.rows,
        columns: length
      })
    } else {
      grid.push({
        rows: grid.length + 1 + (Number.isInteger(length) ? 0 : 1),
        columns: Number.isInteger(length) ? length: parseInt(length) + 1
      });
      const _length = Number.isInteger(length) ? length: parseInt(length);
      this._setMapControlsGrid(_length/2);
    }
};

proto._setMapControlsInsideContainerLenght = function() {
  this.state.mapControl.length = 1;
  // count the mapcontrol insied g3w-map-control container
  this._mapControls.forEach(control => {
    const map = this.getMap();
    this.state.mapControl.length+=control.mapcontrol ? 1: 0;
    control.control.changelayout ? control.control.changelayout(map) : null;
  });
  // add 1 id odd number
  this.state.mapControl.length += this.state.mapControl.length% 2;
  this.state.mapControl.grid = [];
  this._setMapControlsGrid(this.state.mapControl.length);
};

proto.filterableLayersAvailable = function() {
  const layers = getMapLayersByFilter({
    FILTERABLE: true,
    SELECTEDORALL: true
  });
  return layers.some(layer => layer.getProvider('filter') instanceof WFSProvider);
};

proto.setMapControlsAlignement = function(alignement='rv') {
  this.state.mapcontrolsalignement = alignement;
};

proto.getMapControlsAlignement = function() {
  return this.state.mapcontrolsalignement
};

proto.isMapControlsVerticalAlignement = function() {
  return this.state.mapcontrolsalignement.indexOf('v') !== -1;
};

proto.setMapControlsVerticalAlignement = function() {
  this.state.mapcontrolsalignement = this.state.mapcontrolsalignement[0] + 'v';
};

proto.setMapControlsHorizontalAlignement = function() {
  this.state.mapcontrolsalignement = this.state.mapcontrolsalignement[0] + 'h';
};

proto.flipControlsHorizontally = function() {
  this.state.mapcontrolsalignement = this.state.mapcontrolsalignement[0] === 'r' ? 'l' + this.state.mapcontrolsalignement[1] : 'r' + this.state.mapcontrolsalignement[1]
};

proto.flipMapControlsVertically = function() {
  this.state.mapcontrolsalignment = this.state.mapcontrolsalignement[1] === 'v' ? this.state.mapcontrolsalignement[0] + 'h' :  this.state.mapcontrolsalignement[0] + 'v'
};

proto.setMapControlsContainer = function(mapControlDom) {
  this.state.mapcontrolDOM = mapControlDom;
};

proto._updateMapControlsLayout = function({width, height}={}) {
  // case mobile open keyboard
  (width == 0 || height == 0) ? this.state.mapcontrolDOM.css('z-index', 0) : this.state.mapcontrolDOM.css('z-index', 100);
  // update only when all control are ready
  if (this.state.mapcontrolready && this.state.mapControl.update) {
    const changedAndMoreSpace = {
      changed : false,
      space: false
    };
    // count the mapcontrol insied g3w-map-control container
    this._mapControls.forEach(control => {
      const map = this.getMap();
      control.control.changelayout ? control.control.changelayout(map) : null;
    });
    // check if is vertical
    if (this.isMapControlsVerticalAlignement()) {
      const handleVerticalMapControlDOMElements = () => {
        const mapControslHeight = this.state.mapControl.grid[this.state.mapControl.currentIndex].columns * this.state.mapcontrolSizes.minWidth;
        // get bottom controls
        const bottomMapControls =  $(`.ol-control-b${this.getMapControlsAlignement()[0]}`);
        const bottomMapControlTop = bottomMapControls.length ? $(bottomMapControls[bottomMapControls.length - 1]).position().top: height;
        const freeSpace =  bottomMapControlTop > 0 ? bottomMapControlTop - mapControslHeight : height - mapControslHeight;
        if (freeSpace < 10) {
          if (isMobile.any) {
            this.setMapControlsAlignement('rh');
            return;
          } else
            this.state.mapControl.currentIndex = this.state.mapControl.currentIndex === this.state.mapControl.grid.length - 1 ? this.state.mapControl.currentIndex : this.state.mapControl.currentIndex +1;
          changedAndMoreSpace.changed = true;
        } else {
          // check if there enought space to expand mapcontrols
          const nextHeight = this.state.mapControl.currentIndex > 0 ? (this.state.mapControl.grid[this.state.mapControl.currentIndex -1].columns * this.state.mapcontrolSizes.minWidth) - mapControslHeight : mapControslHeight;
          if (freeSpace  > nextHeight) {
            changedAndMoreSpace.changed = true;
            changedAndMoreSpace.space = true;
            this.state.mapControl.currentIndex = this.state.mapControl.currentIndex === 0 ? this.state.mapControl.currentIndex : this.state.mapControl.currentIndex  - 1;
          }
        }
        if (changedAndMoreSpace.changed) {
          const mapControslHeight = this.state.mapControl.grid[this.state.mapControl.currentIndex].columns * this.state.mapcontrolSizes.minWidth;
          const mapControlsWidth = this.state.mapControl.grid[this.state.mapControl.currentIndex].rows * this.state.mapcontrolSizes.minWidth;
          this.state.mapcontrolDOM.css('height', `${mapControslHeight}px`);
          this.state.mapcontrolDOM.css('width', `${mapControlsWidth}px`);
          changedAndMoreSpace.changed = false;
          changedAndMoreSpace.space && setTimeout(()=>handleVerticalMapControlDOMElements());
        }
      };
      handleVerticalMapControlDOMElements();
    } else isMobile.any && this.setMapControlsAlignement('rv');
  }
};

proto._setMapControlVisible = function({control, visible=true}) {
   control && (visible && $(control.element).show() || $(control.element).hide());
};

proto._addControlToMapControls = function(control, visible=true) {
  const controlElement = control.element;
  if (!visible) control.element.style.display = "none";
  $('.g3w-map-controls').append(controlElement);
};

proto.getMapControlByType = function({type}={}) {
  const mapControl = this._mapControls.find(mapControl => type === mapControl.type);
  return mapControl && mapControl.control;
};

/**
 *
 *
 * @param id
 * @param type
 * @param control
 * @param addToMapControls
 * @param visible
 */
proto.addControl = function(id, type, control, addToMapControls=true, visible=true) {
  this.state.mapcontrolready = false;
  this.viewer.map.addControl(control);
  control.on('toggled', evt => this.emit('mapcontrol:toggled', evt));
  this._mapControls.push({
    id,
    type,
    control,
    visible,
    mapcontrol: addToMapControls && visible
  });
  control.on('controlclick', active => this.controlClick(active));
  const buttonControl = $(control.element).find('button');
  buttonControl.tooltip({
    placement: 'bottom',
    trigger : GUI.isMobile()? 'click': 'hover'
  });
  // in case of mobile hide tooltip after click
  GUI.isMobile() && buttonControl.on('shown.bs.tooltip', function(){
    setTimeout(()=>$(this).tooltip('hide'), 600);
  });
  if (addToMapControls) this._addControlToMapControls(control, visible);
  else {
    const $mapElement = $(`#${this.getMap().getTarget()}`);
    this._updateMapControlsLayout({
      width: $mapElement.width(),
      height: $mapElement.height()
    })
  }
  ControlsRegistry.registerControl(type, control);
  this._setMapControlsInsideContainerLenght();
  this.state.mapcontrolready = true;
};

proto.showControl = function(type) {
  this.showControls([type]);
};

proto.hideControl = function(type) {
  this.hideControls([type]);
};

proto.showControls = function(types) {
  this.toggleControls(true,types);
};

proto.hideControls = function(types) {
 this.toggleControls(false,types);
};

proto.showAllControls = function() {
  this.toggleControls(true);
};

proto.hideAllControls = function() {
  this.toggleControls(false);
};

proto.toggleControls = function(toggle, types) {
  this._removeControls();
  this._mapControls.forEach(controlObj => {
    if (types) {
      if (types.indexOf(controlObj.type) > -1) controlObj.visible = toggle;
    } else controlObj.visible = toggle;
  });
  this._layoutControls();
};

proto._layoutControls = function() {
  this._mapControls.forEach(controlObj => {
    if (controlObj.visible) this.viewer.map.addControl(controlObj.control);
  })
};

proto.getMapControls = function() {
  return this._mapControls;
};

proto.removeControlById = function(id) {
  this._mapControls.find((controlObj, ctrlIdx) => {
    if (id === controlObj.id) {
      this._mapControls.splice(ctrlIdx, 1);
      const control = controlObj.control;
      this.viewer.map.removeControl(control);
      control.hideControl && control.hideControl();
      return true;
    }
  })
};

proto.removeControl = function(type) {
  this._mapControls.find((controlObj, ctrlIdx) => {
    if (type === controlObj.type) {
      this._mapControls.splice(ctrlIdx, 1);
      const control = controlObj.control;
      this.viewer.map.removeControl(control);
      control.hideControl && control.hideControl();
      return true;
    }
  })
};

proto._removeControls = function() {
  this._mapControls.forEach(controlObj => this.viewer.map.removeControl(controlObj.control));
};

proto._unToggleControls = function({close=true} = {}) {
  this._mapControls.forEach(controlObj => {
    if (controlObj.control.isToggled && controlObj.control.isToggled()) {
      controlObj.control.toggle(false);
      close && GUI.closeContent();
    }
  });
};

proto.deactiveMapControls = function() {
  this._unToggleControls({
    close: false
  })
};

/**
 *
 * Method to disable
 */
proto.disableClickMapControls = function(bool=true){
  this._mapControls.forEach(controlObj => {
    const {control} = controlObj;
    const clickmap = control.isClickMap ? control.isClickMap() : false;
    clickmap && control[bool ? 'disable' : 'enable']();
  })
};

proto.addMapLayers = function(mapLayers) {
  mapLayers.reverse().forEach(mapLayer => this.addMapLayer(mapLayer));
};

proto._setupCustomMapParamsToLegendUrl = function(bool=true){
  if (bool) {
    const size = this.getMap() && this.getMap().getSize().filter(value => value > 0) || null;
    const bbox = size && size.length === 2 ? this.getMap().getView().calculateExtent(size): null;
    //setup initial legend parameter
    this.getMapLayers().forEach(mapLayer => {
      mapLayer.setupCustomMapParamsToLegendUrl && mapLayer.setupCustomMapParamsToLegendUrl({
        crs: this.getEpsg(),
        bbox: bbox || this.project.state.initextent
      })
    });
  }
  this.emit('change-map-legend-params')
};

proto.addMapLayer = function(mapLayer) {
  this._mapLayers.push(mapLayer);
  this.addLayerToMap(mapLayer)
};

proto.getMapLayers = function() {
  return this._mapLayers;
};

proto.getBaseLayers = function() {
  return this.mapBaseLayers;
};

proto.getMapLayerForLayer = function(layer) {
  const multilayerId = 'layer_'+layer.getMultiLayerId();
  const mapLayers = this.getMapLayers();
  const mapLayer = mapLayers.find(mapLayer => mapLayer.getId() === multilayerId);
  return mapLayer;
};

proto.getProjectLayer = function(layerId) {
  return MapLayersStoreRegistry.getLayerById(layerId);
};

proto._setSettings = function(){
  const maxScale = this.getScaleFromExtent(this.project.state.initextent);
  // settings maxScale
  SETTINGS.zoom.maxScale = 2000 > maxScale ? maxScale : 2000;
};

proto._resetView = function() {
  const [width, height] = this.viewer.map.getSize();
  const extent = this.project.state.extent;
  const maxxRes = ol.extent.getWidth(extent) / width;
  const minyRes = ol.extent.getHeight(extent) / height;
  const maxResolution = Math.max(maxxRes,minyRes) > this.viewer.map.getView().getMaxResolution() ? Math.max(maxxRes,minyRes): this.viewer.map.getView().getMaxResolution();
  const view = new ol.View({
    extent,
    projection: this.viewer.map.getView().getProjection(),
    center: this.viewer.map.getView().getCenter(),
    resolution: this.viewer.map.getView().getResolution(),
    maxResolution
  });
  this._setSettings();
  this.viewer.map.setView(view);
};

proto._calculateViewOptions = function({project, width, height}={}) {
  const searchParams = new URLSearchParams(location.search);
  const map_extent = searchParams.get('map_extent');
  const initextent = map_extent ? map_extent.split(',').map(coordinate => 1*coordinate) : project.state.initextent;
  const projection = this.getProjection();
  const extent = project.state.extent;
  const maxxRes = ol.extent.getWidth(extent) / width;
  const maxyRes = ol.extent.getHeight(extent) / height;
  const maxResolution = Math.max(maxxRes,maxyRes);
  const initxRes = ol.extent.getWidth(initextent) / width;
  const inityRes = ol.extent.getHeight(initextent) / height;
  const resolution = Math.max(initxRes,inityRes);
  const center = ol.extent.getCenter(initextent);
  return {
    projection,
    center,
    extent,
    maxResolution,
    resolution
  }
};

// set view based on project config
proto._setupViewer = function(width, height) {
  this.viewer = olhelpers.createViewer({
    id: this.target,
    view: this._calculateViewOptions({
      width,
      height,
      project: this.project
    })
  });
  this._setSettings();
  this.state.size = this.viewer.map.getSize();
  //set mapunit
  this.state.mapUnits = this.viewer.map.getView().getProjection().getUnits();

  if (this.config.background_color) {
    $('#' + this.target).css('background-color', this.config.background_color);
  }

  $(this.viewer.map.getViewport()).prepend('<div id="map-spinner" style="position:absolute; top: 50%; right: 50%"></div>');

  this.viewer.map.getInteractions().forEach(interaction => this._watchInteraction(interaction));

  this.viewer.map.getInteractions().on('add', interaction => this._watchInteraction(interaction.element));

  this.viewer.map.getInteractions().on('remove', interaction => {
    //this._onRemoveInteraction(interaction););
  });

  this._marker = new ol.Overlay({
    position: null,
    positioning: 'center-center',
    element: document.getElementById('marker'),
    stopEvent: false
  });

  this.viewer.map.addOverlay(this._marker);
};

proto.getMapUnits = function() {
  return this.state.mapUnits;
};

proto._removeListeners = function() {
  this._setBaseLayerListenerKey && this.project.un('setBaseLayer', this._setBaseLayerListenerKey);
};

// remove all events of layersStore
proto._removeEventsKeysToLayersStore = function(layerStore) {
  const layerStoreId = layerStore.getId();
  if (this._layersStoresEventKeys[layerStoreId]) {
    this._layersStoresEventKeys[layerStoreId].forEach(eventObj => {
      Object.entries(eventObj).forEach(([event, eventKey]) => layerStore.un(event, eventKey));
    });
    delete this._layersStoresEventKeys[layerStoreId];
  }
};

// register all events of layersStore and relative keys
proto._setUpEventsKeysToLayersStore = function(layerStore) {
  const layerStoreId = layerStore.getId();
  // check if already store a key of events
  this._layersStoresEventKeys[layerStoreId] = [];
  //SETVISIBILITY EVENT
  const layerVisibleKey = layerStore.onafter('setLayersVisible',  layersIds => {
    layersIds.forEach(layerId => {
      const layer = layerStore.getLayerById(layerId);
      const mapLayer = this.getMapLayerForLayer(layer);
      mapLayer && this.updateMapLayer(mapLayer)
    });
  });

  this._layersStoresEventKeys[layerStoreId].push({
    setLayersVisible: layerVisibleKey
  });
  //ADD LAYER
  const addLayerKey = layerStore.onafter('addLayer', layer => {
    if (layer.getType() === 'vector') {
      const mapLayer = layer.getMapLayer();
      this.addLayerToMap(mapLayer);
    }
  });
  this._layersStoresEventKeys[layerStoreId].push({
    addLayer: addLayerKey
  });
  // REMOVE LAYER
  const removeLayerKey = layerStore.onafter('removeLayer',  layer => {
    if (layer.getType() === 'vector') {
      const olLayer = layer.getOLLayer();
      this.viewer.map.removeLayer(olLayer);
    }
  });

  this._layersStoresEventKeys[layerStoreId].push({
    removeLayer: removeLayerKey
  });
};

proto._setupListeners = function() {
  this._setBaseLayerListenerKey = this.project.onafter('setBaseLayer',() => {
    this.updateMapLayers();
  });
};

// SETUP ALL LAYERS
proto._setupAllLayers = function() {
  this._setupBaseLayers();
  this._setupMapLayers();
  this._setupVectorLayers();
  this._setUpDefaultLayers()
};

//SETUP BASELAYERS
proto._setupBaseLayers = function(){
  const baseLayers = getMapLayersByFilter({
    BASELAYER: true
  });
  if (!baseLayers.length) return;
  baseLayers.forEach(layer => {
    const baseMapLayer = layer.getMapLayer();
    this.registerMapLayerListeners(baseMapLayer);
    this.mapBaseLayers[layer.getId()] = baseMapLayer;
  });
  const reverseBaseLayers = Object.values(this.mapBaseLayers).reverse();
  reverseBaseLayers.forEach(baseMapLayer => {
    baseMapLayer.update(this.state, this.layersExtraParams);
    this.addLayerToMap(baseMapLayer)
  });
};

//SETUP MAPLAYERS
proto._setupMapLayers = function() {
  const layers = getMapLayersByFilter({
    BASELAYER: false,
    VECTORLAYER: false
  });
  this._setMapProjectionToLayers(layers);
  //group layer by mutilayer
  const multiLayers = _.groupBy(layers, layer => layer.getMultiLayerId());
  let mapLayers = [];
  Object.entries(multiLayers).forEach(([id, layers]) => {
    const multilayerId = `layer_${id}`;
    let mapLayer;
    const layer = layers[0] || [];
    if (layers.length === 1) {
      mapLayer = layer.getMapLayer({
        id: multilayerId,
        projection: this.getProjection()
      }, {});
      mapLayer.addLayer(layer);
      mapLayers.push(mapLayer)
    } else {
      mapLayer = layer.getMapLayer({
        id: multilayerId,
        projection: this.getProjection()
      }, this.layersExtraParams);
      layers.reverse().forEach(sub_layer => mapLayer.addLayer(sub_layer));
      mapLayers.push(mapLayer);
    }
    this.registerMapLayerListeners(mapLayer);
  });
  this.addMapLayers(mapLayers);
  this.updateMapLayers();
  return mapLayers;
};

//SETUP VECTORLAYERS
proto._setupVectorLayers = function() {
  const layers = getMapLayersByFilter({
    VECTORLAYER: true
  });
  this._setMapProjectionToLayers(layers);
  layers.forEach(layer => {
    const mapVectorLayer = layer.getMapLayer();
    this.addLayerToMap(mapVectorLayer)
  })
};

proto._setUpDefaultLayers = function(){
  // follow the order that i want
  this.getMap().addLayer(this.defaultsLayers.highlightLayer);
  this.getMap().addLayer(this.defaultsLayers.selectionLayer);
};

proto.removeDefaultLayers = function(){
  this.defaultsLayers.highlightLayer.getSource().clear();
  this.defaultsLayers.selectionLayer.getSource().clear();
  this.getMap().removeLayer(this.defaultsLayers.highlightLayer);
  this.getMap().removeLayer(this.defaultsLayers.selectionLayer);
};

proto.setDefaultLayerStyle = function(type, style={}){
  if (type && this.defaultsLayers[type]) this.defaultsLayers._style[type] = style;
};

proto.resetDefaultLayerStyle = function(type, style={}){
  if (type && this.defaultsLayers[type]) this.defaultsLayers._style[type] = {
    color: type === 'highlightLayer' ? undefined : 'red'
  };
};

proto.removeLayers = function() {
  this._removeBaseLayers();
  this._removeMapLayers();
  this.removeExternalLayers();
  this.removeDefaultLayers();
};

proto.removeAllLayers = function(){
  this.viewer.removeLayers();
};

proto.addLayerToMap = function(layer) {
  const olLayer = layer.getOLLayer();
  olLayer && this.getMap().addLayer(olLayer);
};

proto._setMapProjectionToLayers = function(layers) {
  // setup mapProjection on ech layers
  layers.forEach(layer => layer.setMapProjection(this.getProjection()));
};

proto.createMapLayer = function(layer) {
  layer.setMapProjection(this.getProjection());
  const multilayerId = `layer_${layer.getMultiLayerId()}`;
  const mapLayer = layer.getMapLayer({
    id: multilayerId,
    projection: this.getProjection()
  }, this.layersExtraParams);
  mapLayer.addLayer(layer);
 return mapLayer;
};

proto.getOverviewMapLayers = function(project) {
  const WMSLayer = require('core/layers/map/wmslayer');
  const projectLayers = project.getLayersStore().getLayers({
    GEOLAYER: true,
    BASELAYER: false,
  });
  const multiLayers = _.groupBy(projectLayers,layer => layer.getMultiLayerId());
  let overviewMapLayers = [];

  Object.entries(multiLayers).forEach(([id, layers]) => {
    const multilayerId = 'overview_layer_'+id;
    const tiled = layers[0].state.tiled;
    const config = {
      url: project.getWmsUrl(),
      id: multilayerId,
      tiled: tiled
    };
    const mapLayer = new WMSLayer(config);
    layers.reverse().forEach(layer => mapLayer.addLayer(layer));
    overviewMapLayers.push(mapLayer.getOLLayer(true));
  });
  return overviewMapLayers.reverse();
};

proto.updateMapLayer = function(mapLayer, options={}) {
  const { force=false } = options;
  !force ? mapLayer.update(this.state, {}) : mapLayer.update(this.state, {"time": Date.now()})
};

// run update function on ech mapLayer
proto.updateMapLayers = function(options={}) {
  this.getMapLayers().forEach(mapLayer => this.updateMapLayer(mapLayer, options));
  const baseLayers = this.getBaseLayers();
  //updatebase layer
  Object.values(baseLayers).forEach(baseLayer => baseLayer.update(this.state, this.layersExtraParams));
};

// register map Layer listeners of creation
proto.registerMapLayerListeners = function(mapLayer) {
  mapLayer.on('loadstart', this._incrementLoaders);
  mapLayer.on('loadend', this._decrementLoaders);
  mapLayer.on('loaderror', this._mapLayerLoadError);
  //listen change filter token
  if (mapLayer.layers && Array.isArray(mapLayer.layers))
    mapLayer.layers.forEach(layer => {
      layer.onbefore('change', ()=>this.updateMapLayer(mapLayer, {force: true}));
      layer.on('filtertokenchange', ()=> this.updateMapLayer(mapLayer, {force: true}))
    });
  ///
};

// unregister listeners of mapLayers creation
proto.unregisterMapLayerListeners = function(mapLayer) {
  mapLayer.off('loadstart', this._incrementLoaders );
  mapLayer.off('loadend', this._decrementLoaders );
  mapLayer.off('loaderror', this._mapLayerLoadError);
  // try to remove layer filter token
  if (mapLayer.layers && Array.isArray(mapLayer.layers))
    mapLayer.layers.forEach(layer => {
      layer.un('change');
      layer.removeEvent('filtertokenchange')
    });
};

proto.setTarget = function(elId) {
  this.target = elId;
};

proto.getCurrentToggledMapControl = function(){
  const mapControl = this._mapControls.find(({control}) => control && control.isToggled && control.isToggled());
  return mapControl && mapControl.control;
};

/**
 * close: param to close eventually right content open
 * @param interaction
 * @param close
 */
proto.addInteraction = function(interaction, close) {
  const control = this.getCurrentToggledMapControl();
  const untoggleMapControls = control && control.isClickMap ? control.isClickMap() : true ;
  untoggleMapControls && this._unToggleControls({
    close
  });
  this.getMap().addInteraction(interaction);
  interaction.setActive(true);
};

proto.removeInteraction = function(interaction) {
  interaction && interaction.setActive(false);
  this.viewer.map.removeInteraction(interaction);
};

proto._watchInteraction = function(interaction) {
  interaction.on('change:active', e => {
    if ((e.target instanceof ol.interaction.Pointer) && e.target.getActive()) {
      this.emit('mapcontrol:active', e.target);
    }
  })
};

proto.zoomTo = function(coordinate, zoom) {
  zoom = _.isNumber(zoom) ? zoom : 6;
  this.viewer.zoomTo(coordinate, zoom);
};

proto.goTo = function(coordinates,zoom) {
  const options = {
    zoom: zoom || 6
  };
  this.viewer.goTo(coordinates, options);
};

proto.goToRes = function(coordinates, resolution){
  this.viewer.goToRes(coordinates, {
    resolution
  });
};

proto.getGeometryAndExtentFromFeatures = function(features=[]){
  let extent;
  let geometryType;
  let geometry;
  let coordinates;
  let geometryCoordinates = [];
  for (let i=0; i < features.length; i++) {
    const feature = features[i];
    const geometry = feature.getGeometry ? feature.getGeometry() : feature.geometry;
    if (geometry) {
      if (geometry instanceof ol.geom.Geometry) {
        const featureExtent = [...geometry.getExtent()];
        extent = !extent ? featureExtent : ol.extent.extend(extent, featureExtent);
        geometryType = geometryType ? geometryType : geometry.getType();
        coordinates = geometry.getCoordinates();
        if (geometryType.includes('Multi')) geometryCoordinates = [...geometryCoordinates, ...coordinates];
        else geometryCoordinates.push(coordinates);
      } else {
        const featureExtent = feature.bbox;
        extent = !extent ? featureExtent : ol.extent.extend(extent, featureExtent);
        geometryType = geometry.type;
        coordinates = geometry.coordinates;
      }
      if (geometryType.includes('Multi')) geometryCoordinates = [...geometryCoordinates, ...coordinates];
      else geometryCoordinates.push(coordinates);
    }
  }
  try {
    const olClassGeomType = geometryType.includes('Multi') ? geometryType : `Multi${geometryType}`;
    geometry = new ol.geom[olClassGeomType](geometryCoordinates);
  } catch(err){}
  return {
    extent,
    geometry
  }
};

proto.highlightFeatures = function(features, options={}){
  const {geometry} = this.getGeometryAndExtentFromFeatures(features);
  //force zoom false
  options.zoom = false;
  this.highlightGeometry(geometry, options);
};

proto.zoomToFeatures = function(features, options={highlight: false}) {
  const {geometry, extent} = this.getGeometryAndExtentFromFeatures(features);
  const {highlight} = options;
  if (highlight && extent) options.highLightGeometry = geometry;
  extent && this.zoomToExtent(extent, options);
};

proto.zoomToExtent = function(extent, options={}) {
  const center = ol.extent.getCenter(extent);
  const resolution = this.getResolutionForZoomToExtent(extent);
  this.goToRes(center, resolution);
  options.highLightGeometry && this.highlightGeometry(options.highLightGeometry, {
    zoom: false,
    duration: options.duration
  });
};

proto.zoomToProjectInitExtent = function(){
  this.zoomToExtent(this.project.state.initextent);
};

proto.compareExtentWithProjectMaxExtent = function(extent){
  const projectExtent = this.project.state.extent;
  const inside = ol.extent.containsExtent(projectExtent, extent);
  return inside ? extent : projectExtent;
};

proto.getResolutionForZoomToExtent = function(extent){
  let resolution;
  const map = this.getMap();
  const projectExtent = this.project.state.extent;
  const projectMaxResolution = map.getView().getResolutionForExtent(projectExtent, map.getSize());
  const inside = ol.extent.containsExtent(projectExtent, extent);
  // max resolution of the map
  const maxResolution = getResolutionFromScale(SETTINGS.zoom.maxScale, this.getMapUnits()); // map resolution of the map
  // check if
  if (inside) {
    // calculate main resolutions
    const currentResolution = map.getView().getResolution(); // Current Resolution
    const extentResolution = map.getView().getResolutionForExtent(extent, map.getSize()); // resolution of request extent
    ////
    // set the final resolution to go to
    resolution = extentResolution > maxResolution ? extentResolution: maxResolution;
    resolution = (currentResolution < resolution) && (currentResolution > extentResolution) ? currentResolution : resolution;
  } else resolution = projectMaxResolution; // set max resolution
  return resolution
};

proto.goToBBox = function(bbox, epsg=this.getEpsg()) {
  bbox = epsg === this.getEpsg() ? bbox : ol.proj.transformExtent(bbox, epsg, this.getEpsg());
  this.viewer.fit(this.compareExtentWithProjectMaxExtent(bbox));
};

proto.goToWGS84 = function(coordinates,zoom){
  coordinates = ol.proj.transform(coordinates,'EPSG:4326',this.project.state.crs.epsg);
  this.goTo(coordinates,zoom);
};

proto.extentToWGS84 = function(extent){
  return ol.proj.transformExtent(extent,this.project.state.crs.epsg,'EPSG:4326');
};

proto.getResolutionForMeters = function(meters) {
  const viewport = this.viewer.map.getViewport();
  return meters / Math.max(viewport.clientWidth,viewport.clientHeight);
};

let animatingHighlight = false;

/*
* geometries = array of geometries
* action: add, clear, remove :
*                             add: feature/features to selectionLayer. If selectionLayer doesn't exist create a  new vector layer.
*                             clear: remove selectionLayer
*                             remove: remove feature from selectionlayer. If no more feature are in selectionLayer it will be removed
* */
proto.setSelectionFeatures = function(action='add', options={}){
  const {feature, color} = options;
  color && this.setDefaultLayerStyle('selectionLayer', {color});
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
};

proto.clearSelectionFeatures = function(){
  this.defaultsLayers.selectionLayer.getSource().clear();
};

proto.seSelectionLayerVisible = function(visible=true) {
  this.defaultsLayers.selectionLayer.setVisible(visible);
};

proto.highlightGeometry = function(geometryObj, options = {}) {
  return new Promise((resolve, reject) => {
    const {color} = options;
    this.clearHighlightGeometry();
    this.setDefaultLayerStyle('highlightLayer', {
      color
    });
    let zoom = (typeof options.zoom === 'boolean') ? options.zoom : true;
    let hide = options.hide;
    if (hide) hide = typeof hide === 'function' ? hide: null;
    const customStyle = options.style;
    const defaultStyle = function(feature){
      let styles = [];
      const geometryType = feature.getGeometry().getType();
      const style = createSelectedStyle({
        geometryType,
        color
      });
      styles.push(style);
      return styles;
    };
    const highlight = (typeof options.highlight == 'boolean') ? options.highlight : true;
    const duration = options.duration || SETTINGS.animation.duration;
    let geometry;
    if (geometryObj instanceof ol.geom.Geometry) geometry = geometryObj;
    else {
      const format = new ol.format.GeoJSON;
      geometry = format.readGeometry(geometryObj);
    }
    if (zoom) {
      const extent = geometry.getExtent();
      this.zoomToExtent(extent);
    }
    if (highlight) {
      const feature = new ol.Feature({
        geometry
      });
      const highlightLayer = this.defaultsLayers.highlightLayer;
      customStyle && highlightLayer.setStyle(customStyle);
      highlightLayer.getSource().addFeature(feature);
      if (hide) {
        const callback = ()=> {
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
          }, duration)
        }
      }
    } else resolve()
  })
};

proto.clearHighlightGeometry = function() {
  !animatingHighlight && this.defaultsLayers.highlightLayer.getSource().clear();
  this.resetDefaultLayerStyle('highlightLayer');
};

proto.refreshMap = function(options) {
  this.updateMapLayers(options);
};

// called when layout (window) resize
proto.layout = function({width, height}) {
  const is_hidden = (width <= 0 || height <= 0);
  if (!this.viewer) {
    this.setupViewer(width,height);
    if (this.viewer) {
      this.setupControls();
      this.emit('ready');
    }
  } else {
    if (!is_hidden) {
      this.getMap().updateSize();
      this.state.hidemaps.forEach(hidemap => hidemap.map.updateSize());
      this._updateMapView();
    }
  }
  this.setHidden(is_hidden);
  this._mapControls.length && this._updateMapControlsLayout({width, height});
};

//remove BaseLayers
proto._removeBaseLayers = function(){
  Object.keys(this.mapBaseLayers).forEach(baseLayerId=>{
    this.viewer.map.removeLayer(this.mapBaseLayers[baseLayerId].getOLLayer())
  })
};

// function to remove maplayers
proto._removeMapLayers = function() {
  this.getMapLayers().forEach(mapLayer => {
    this.unregisterMapLayerListeners(mapLayer);
    this.viewer.map.removeLayer(mapLayer.getOLLayer());
  });
  this._mapLayers = [];
};

proto.getMapBBOX = function() {
  return this.viewer.getBBOX();
};

proto._updateMapView = function() {
  const bbox = this.viewer.getBBOX();
  const resolution = this.viewer.getResolution();
  const center = this.viewer.getCenter();
  const size = this.getMap().getSize();
  this.updateMapView(bbox, resolution, center, size);
};

proto.getMapSize = function() {
  const map = this.viewer.map;
  return map.getSize();
};

proto.setInnerGreyCoverScale = function(scale) {
  this._drawShadow.scale = scale;
};

proto._resetDrawShadowInner = function() {
  this._drawShadow = {
    type: 'coordinate',
    outer: [],
    inner: [],
    scale: null,
    rotation: null
  };
};

proto.setInnerGreyCoverBBox = function(options={}) {
  const map = this.viewer.map;
  const type = options.type || 'coordinate';
  const inner = options.inner || null;
  const rotation = options.rotation;
  const scale = options.scale;
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
        break
    }
    const y_min = lowerLeftInner[1] * ol.has.DEVICE_PIXEL_RATIO;
    const x_min = lowerLeftInner[0] * ol.has.DEVICE_PIXEL_RATIO;
    const y_max = upperRightInner[1] * ol.has.DEVICE_PIXEL_RATIO;
    const x_max = upperRightInner[0] * ol.has.DEVICE_PIXEL_RATIO;
    this._drawShadow.inner[0] = x_min;
    this._drawShadow.inner[1] = y_min;
    this._drawShadow.inner[2] = x_max;
    this._drawShadow.inner[3] = y_max;
  }
  if (_.isNil(scale)) this._drawShadow.scale = this._drawShadow.scale || 1;
  else this._drawShadow.scale = scale;

  if (_.isNil(rotation)) this._drawShadow.rotation = this._drawShadow.rotation || 0;
  else this._drawShadow.rotation = rotation;

  this._drawShadow.outer &&  map.render();
};

// grey map precompose mapcompose
proto.startDrawGreyCover = function(message) {
  // after rendering the layer, restore the canvas context
  const map = this.viewer.map;
  let x_min, x_max, y_min, y_max, rotation, scale;
  this.stopDrawGreyCover();
  const postcompose = evt => {
    const ctx = evt.context;
    const size = this.getMap().getSize();
    // Inner polygon,must be counter-clockwise
    const height = size[1] * ol.has.DEVICE_PIXEL_RATIO;
    const width = size[0] * ol.has.DEVICE_PIXEL_RATIO;
    this._drawShadow.outer = [0,0,width, height];
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
      ctx.translate((x_max+x_min)/2, (y_max+y_min)/2);
      ctx.rotate(rotation*Math.PI / 180);
      ctx.moveTo(-((x_max-x_min)/2),((y_max-y_min)/2));
      ctx.lineTo(((x_max-x_min)/2),((y_max-y_min)/2));
      ctx.lineTo(((x_max-x_min)/2),-((y_max-y_min)/2));
      ctx.lineTo(-((x_max-x_min)/2),-((y_max-y_min)/2));
      ctx.lineTo(-((x_max-x_min)/2),((y_max-y_min)/2));
      ctx.closePath();
      // end inner bbox
    }
    ctx.fillStyle = 'rgba(0, 5, 25, 0.40)';
    ctx.fill();
    if (message) {
      ctx.font = "bold 25px Arial";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      const arrayMessages = message.split('\n');
      for (let i = 0; i < arrayMessages.length; i++) {
        ctx.fillText(arrayMessages[i], width/2, (height/2) + 30*i);
      }
      //ctx.fillText(message,width/2, height/2);
    }
    ctx.restore();
  };
  this._greyListenerKey = map.on('postcompose', postcompose);
};

proto.stopDrawGreyCover = function() {
  const map = this.getMap();
  if (this._greyListenerKey) {
    ol.Observable.unByKey(this._greyListenerKey);
    this._greyListenerKey = null;
    this._drawShadow.inner.length && this._resetDrawShadowInner();
  }
  map.render();
};

proto.removeExternalLayers = function(){
  this._externalLayers.forEach(layer =>{
    const name = layer.get('name');
    this.removeExternalLayer(name);
  });
  this._externalLayers = [];
};

proto.removeExternalLayer = function(name) {
  const layer = this.getLayerByName(name);
  const catalogService = GUI.getComponent('catalog').getService();
  const QueryResultService = GUI.getComponent('queryresults').getService();
  QueryResultService.unregisterVectorLayer(layer);
  this.viewer.map.removeLayer(layer);
  catalogService.removeExternalLayer(name);
};

proto.addExternalLayer = async function(externalLayer, options={}) {
  let vectorLayer,
    name,
    data,
    color,
    style,
    type,
    crs;
  const map = this.viewer.map;
  const catalogService = GUI.getComponent('catalog').getService();
  const QueryResultService = GUI.getComponent('queryresults').getService();
  if (externalLayer instanceof ol.layer.Vector) {
    externalLayer.get('id') === undefined && externalLayer.set('id', uniqueId());
    vectorLayer = externalLayer;
    let color;
    try {
      const style = externalLayer.getStyle();
      color = style._g3w_options ? style._g3w_options.color : 'blue'; //setted by geo utils create style function
    } catch(err) {
      color = 'blue'
    }
    name = vectorLayer.get('name') || vectorLayer.get('id');
    type = 'vector';
    externalLayer = {
      name,
      title: name,
      removable: true,
      external: true,
      crs: options.crs,
      type: options.type,
      download: options.download || false,
      visible: true,
      color
    };
  } else {
    name = externalLayer.name;
    type = externalLayer.type;
    crs = externalLayer.crs;
    data = externalLayer.data;
    color = externalLayer.color;
  }
  const layer = this.getLayerByName(name);
  const loadExternalLayer = layer => {
    if (layer) {
      const features = layer.getSource().getFeatures();
      if (features.length) externalLayer.geometryType = features[0].getGeometry().getType();
      const extent = layer.getSource().getExtent();
      externalLayer.bbox = {
        minx: extent[0],
        miny: extent[1],
        maxx: extent[2],
        maxy: extent[3]
      };
      externalLayer.checked = true;
      map.addLayer(layer);
      this._externalLayers.push(layer);
      QueryResultService.registerVectorLayer(layer);
      catalogService.addExternalLayer(externalLayer);
      map.getView().fit(extent);
      return Promise.resolve(layer);
    } else return Promise.reject();
  };
  if (!layer) {
    switch (type) {
      case 'vector':
        return loadExternalLayer(vectorLayer);
        break;
      default:
        vectorLayer = await createVectorLayerFromFile({
          name, type, crs, mapCrs, data, style
        });
        return loadExternalLayer(vectorLayer);
    }
    loadExternalLayer(vectorLayer);
  } else GUI.notify.warning("layer_is_added", true);
};

proto.setExternalLayerStyle = function(color, field) {
  color = color.rgba;
  color = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ','  + color.a + ')';
  const defaultStyle = {
    'Point': new ol.style.Style({
      image: new ol.style.Circle({
        fill: new ol.style.Fill({
          color
        }),
        radius: 5,
        stroke: new ol.style.Stroke({
          color,
          width: 1
        })
      })
    }),
    'LineString': new ol.style.Style({
      stroke: new ol.style.Stroke({
        color,
        width: 3
      })
    }),
    'Polygon': new ol.style.Style({
      fill: new ol.style.Fill({
        color: 'rgba(255,255,255,0.5)'
      }),
      stroke: new ol.style.Stroke({
        color,
        width: 3
      })
    }),
    'MultiPoint': new ol.style.Style({
      image: new ol.style.Circle({
        fill: new ol.style.Fill({
          color
        }),
        radius: 5,
        stroke: new ol.style.Stroke({
          color,
          width: 1
        })
      })
    }),
    'MultiLineString': new ol.style.Style({
      stroke: new ol.style.Stroke({
        color,
        width: 3
      })
    }),
    'MultiPolygon': new ol.style.Style({
      fill: new ol.style.Fill({
        color: 'rgba(255,255,255,0.5)'
      }),
      stroke: new ol.style.Stroke({
        color,
        width: 3
      })
    })
  };
  const styleFunction = function(feature, resolution) {
    const featureStyleFunction = feature.getStyleFunction();
    return featureStyleFunction ? featureStyleFunction.call(feature, resolution) : defaultStyle[feature.getGeometry().getType()];
  };
  return styleFunction;
};

module.exports = MapService;
