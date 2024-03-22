import { MAP_SETTINGS }         from 'app/constant';
import DataRouterService        from 'services/data';
import MapLayersStoresRegistry  from 'store/map-layers';
import ProjectsRegistry         from 'store/projects';
import ApplicationService       from 'services/application';
import ControlsRegistry         from 'store/map-controls';
import GUI                      from 'services/gui';
import MapControlZoomHistory    from "components/MapControlZoomHistory.vue";
import MapControlGeocoding      from 'components/MapControlGeocoding.vue';

const {
  inherit,
  base,
  copyUrl,
  uniqueId,
  throttle,
  toRawType,
  createFilterFromString,
}                               = require('utils');
const G3WObject                 = require('core/g3wobject');
const {
  createVectorLayerFromFile,
  createWMSLayer,
  createSelectedStyle,
  getMapLayersByFilter,
  getGeoTIFFfromServer,
}                               = require('utils/geo');
const BaseLayers                = require('g3w-ol/layers/bases');
const {
  getScaleFromResolution,
  getResolutionFromScale
}                               = require('utils/ol');
const VectorLayer               = require('core/layers/vectorlayer');

const Control                   = require('g3w-ol/controls/control');
const ResetControl              = require('g3w-ol/controls/resetcontrol');
const QueryControl              = require('g3w-ol/controls/querycontrol');
const ZoomBoxControl            = require('g3w-ol/controls/zoomboxcontrol');
const QueryBBoxControl          = require('g3w-ol/controls/querybboxcontrol');
const QueryByPolygonControl     = require('g3w-ol/controls/querybypolygoncontrol');
const GeolocationControl        = require('g3w-ol/controls/geolocationcontrol');
const StreetViewControl         = require('g3w-ol/controls/streetviewcontrol');
const AddLayersControl          = require('g3w-ol/controls/addlayers');
const LengthControl             = require('g3w-ol/controls/lengthcontrol');
const AreaControl               = require('g3w-ol/controls/areacontrol');
const MousePositionControl      = require('g3w-ol/controls/mousepositioncontrol');
const ScaleControl              = require('g3w-ol/controls/scalecontrol');
const OnClikControl             = require('g3w-ol/controls/onclickcontrol');
const ScreenshotControl         = require('g3w-ol/controls/screenshotcontrol');
const geoScreenshotControl      = require('g3w-ol/controls/geoscreenshotcontrol');
const QueryByDrawPolygonControl = require('g3w-ol/controls/querybydrawpolygoncontrol');
const InteractionControl        = require('g3w-ol/controls/interactioncontrol');

const CONTROLS = {
  'zoomtoextent':       OLControl('zoomtoextent'),
  'zoom':               OLControl('zoom'),
  'scaleline':          OLControl('scaleline'),
  'overview':           OLControl('overview'),
  /** @since 3.8.0 */
  'zoomhistory':        VueControl('zoomhistory'),
  'geocoding':          VueControl('nominatim'),
  'reset':              ResetControl,
  'zoombox':            ZoomBoxControl,
  'query':              QueryControl,
  'querybbox':          QueryBBoxControl,
  'querybypolygon':     QueryByPolygonControl,
  'geolocation':        GeolocationControl,
  'streetview':         StreetViewControl,
  'addlayers':          AddLayersControl,
  'length':             LengthControl,
  'area':               AreaControl,
  'mouseposition':      MousePositionControl,
  'scale':              ScaleControl,
  'onclick':            OnClikControl,
  /** @since 3.8.3 */
  'ontoggle':           InteractionControl,
  'screenshot':         ScreenshotControl,
  'geoscreenshot':      geoScreenshotControl,
  'querybydrawpolygon': QueryByDrawPolygonControl,
};

/**
 * BACKCOMP v3.x
 */
CONTROLS['nominatim'] = CONTROLS['geocoding'];

/**
 * @FIXME add description
 * 
 * @since 3.9.0
 */

class OlMapViewer {

  constructor(opts = {}) {
    const controls     = ol.control.defaults({ attribution: false, zoom: false });
    const interactions = ol.interaction.defaults().extend([ new ol.interaction.DragRotate() ]);

    interactions.removeAt(1); // remove douclickzoom

    this.map = new ol.Map({
      controls,
      interactions,
      ol3Logo: false,
      view: opts.view instanceof ol.View ? opts.view : new ol.View(opts.view),
      keyboardEventTarget: document,
      target: opts.id,
    });
  }

  /**
   * @FIXME add description
   */
  destroy() {
    if (this.map) {
      this.map.dispose();
      this.map = null
    }
  }

  /**
   * @FIXME add description
   */
  getView() {
    return this.map.getView();
  }
  /**
   * @FIXME add description
   */
  updateMap(mapObject) { }

  /**
   * @FIXME add description
   */
  updateView(){ }

  /**
   * @FIXME add description
   */
  getMap() {
    return this.map;
  }

  /**
   * @FIXME add description
   */
  setTarget(id) {
    this.map.setTarget(id);
  }

  /**
   * @FIXME add description
   */
  zoomTo(coordinate, zoom) {
    const view = this.map.getView();
    view.setCenter(coordinate);
    view.setZoom(zoom);
  };

  /**
   * @FIXME add description
   */
  goTo(coordinates, options = {}) {
    const view    = this.map.getView();
    const animate = options.animate || true;
    const zoom    = options.zoom || false;
    if (animate) {
      view.animate(
        { duration: 300, center: coordinates },
        (zoom ? ({ zoom, duration: 300 }) : ({ duration: 300, resolution: view.getResolution() })
      ));
    } else {
      view.setCenter(coordinates);
      if (zoom) {
        view.setZoom(zoom);
      }
    }
  }

  /**
   * @FIXME add description
   */
  goToRes(coordinates, options = {}) {
    const view       = this.map.getView();
    const animate    = options.animate || true;
    const resolution = options.resolution || view.getResolution();
    if (animate) {
      view.animate(
        { duration: 200, center: coordinates },
        { duration: 200, resolution }
      );
    } else {
      view.setCenter(coordinates);
      view.setResolution(resolution);
    }
  }

  /**
   * @FIXME add description
   */
  fit(geometry, options = {}) {
    const view    = this.map.getView();
    const animate = options.animate || true;
    if (animate) {
      view.animate({ duration: 200, center: view.getCenter() });
      view.animate({ duration: 200, resolution: view.getResolution() });
    }
    if (options.animate) {
      delete options.animate; // non lo passo al metodo di OL3 perché è un'opzione interna
    }
    view.fit(geometry, {
      ...options,
      constrainResolution: (undefined === options.constrainResolution && true || options.constrainResolution),
      size:  this.map.getSize()
    });
  }

  /**
   * @FIXME add description
   */
  getZoom() {
    return this.map.getView().getZoom();
  }

  /**
   * @FIXME add description
   */
  getResolution() {
    return this.map.getView().getResolution();
  }

  /**
   * @FIXME add description
   */
  getCenter() {
    return this.map.getView().getCenter();
  }

  /**
   * @FIXME add description
   */
  getBBOX() {
    return this.map.getView().calculateExtent(this.map.getSize());
  };

  /**
   * @FIXME add description
   */
  getLayerByName(layerName) {
    return this.map.getLayers().find(layer => layerName === layer.get('name'));
  }

  /**
   * @FIXME add description
   */
  removeLayerByName(layerName) {
    const layer = this.getLayerByName(layerName);
    if (layer) {
      this.map.removeLayer(layer);
    }
  }

  /**
   * @FIXME add description
   */
  getActiveLayers() {
    return this
      .map
      .getLayers()
      .filter((layer) => {
        const props = layer.getProperties();
        return  (props.visible && true !== props.basemap);
      });
  };

  /**
   * @FIXME add description
   */
  removeLayers() {
    this.map.getLayers().clear();
  };

  /**
   * @FIXME add description
   */
  getLayersNoBase() {
    return this
      .map
      .getLayers()
      .filter((layer) => {
        const props = layer.getProperties();
        return (true !== props.basemap);
      });
  }

  /**
   * @FIXME add description
   */
  addBaseLayer(type) {
    this.map.addLayer(type ? BaseLayers[type] : BaseLayers.BING.Aerial);
  };

  /**
   * @TODO double check (unusued and broken code ?)
   */
  changeBaseLayer(layerName) {
    this.map.getLayers().insertAt(0, this.getLayerByName(layername));
  }

}

function MapService(options={}) {
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
    map_info:{
      info: null,
      style: null
    },
    mapunits: ['metric']
  };
  this.id = 'MapService';

  /**
   * @since 3.8.3
   * internal promise. Resolved when view is set
   */
  this._ready = new Promise((resolve, reject) => {
    this.once('viewerset', () => {
      // CHECK IF MAPLAYESRSTOREREGISTRY HAS LAYERSTORE
      MapLayersStoresRegistry.getLayersStores().forEach(this._setUpEventsKeysToLayersStore.bind(this));
      MapLayersStoresRegistry.onafter('addLayersStore', this._setUpEventsKeysToLayersStore.bind(this));
      MapLayersStoresRegistry.onafter('removeLayersStore', this._removeEventsKeysToLayersStore.bind(this));
      resolve();
    });
  })

  this.viewer = null;
  this.target = options.target || null;
  this.layersCount = 0; // useful to set Zindex to layer order on map
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
  this._externalMapLayers = [];
  this._externalLayers = [];
  // array where store interactions added from plugin or external from application
  this._externalInteractions = [];
  this.mapBaseLayers = {};
  /**
   * Default layers are OL layers that are add to map by default.
   * Are used to show selection Features and/or highlight Layer feature
   */
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
          color: this.defaultsLayers._style.highlightLayer.color,
          fill: false
        });
        styles.push(style);
        return styles;
      }
    }),
    selectionLayer: new ol.layer.Vector({
      source: new ol.source.Vector(),
      style: feature => {
        let styles = [];
        const geometryType = feature.getGeometry().getType();
        const style = createSelectedStyle({
          geometryType,
          color: this.defaultsLayers._style.selectionLayer.color,
          fill: false
        });
        styles.push(style);
        return styles;
      }
    })
  };
  this.layersExtraParams = {};
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
    if (this._howManyAreLoading === 0) {
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
    setupControls() {
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
    controlClick(mapcontrol, info={}) {},
    loadExternalLayer(layer) {}, // used in general to alert external layer is  loaded
    unloadExternalLayer(layer) {}
  };

  this._onCatalogSelectLayer = function(layer) {
    ControlsRegistry.catalogSelectedLayer(layer);
  };

  this.on('cataloglayerselected', this._onCatalogSelectLayer);

  this._keyEvents.eventemitter.push({
    event: 'cataloglayerselected',
    listener: this._onCatalogSelectLayer
  });

  const extraParamsSet = (extraParams, update) => {
    update && this.getMapLayers().forEach(mapLayer => mapLayer.update(this.state, extraParams));
  };

  this.on('extraParamsSet', extraParamsSet);

  this._keyEvents.eventemitter.push({
    event: 'extraParamsSet',
    listener: extraParamsSet
  });

  base(this);
}

inherit(MapService, G3WObject);

const proto = MapService.prototype;

/**
 * @since 3.8.3
 * return promise ready
 */
proto.isReady = function(){
  return this._ready;
};

proto.setUpMapOlEvents = function() {
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
  } else this.setupCustomMapParamsToLegendUrl(); //set always to show legend at start
};

//clear methods to remove all listeners events
proto.clear = function() {
  Object
    .keys(this._keyEvents)
    .forEach(type => {
      switch(type) {
        case 'ol':
          this._keyEvents[type].forEach(key => ol.Observable.unByKey(key));
          break;
        case 'g3wobject':
          this._keyEvents[type].forEach(({ who, setter, key }) => { who.un(setter, key); });
          break;
        case 'eventemitter':
          this._keyEvents[type].forEach(({ event, listener }) => { this.removeListener(event, listener); });
          break;
      }
    });
  this._keyEvents = null;
  MapLayersStoresRegistry.getLayersStores().forEach(this._removeEventsKeysToLayersStore.bind(this))
};

proto.showMapSpinner = function() {
  GUI.showSpinner({
    container: $('#map-spinner'),
    id: 'maploadspinner',
    style: 'transparent'
  });
};

proto.hideMapSpinner = function() {
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
  const viewer = new OlMapViewer({
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
    if (id === this.state.hidemaps[i].id) {
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

proto.setLayersExtraParams = function(params,update) {
  this.layersExtraParams = _.assign(this.layersExtraParams, params);
  this.emit('extraParamsSet',params,update);
};

proto.getProject = function() {
  return this.project;
};

proto.getMap = function() {
  try {
    return this.viewer.map;
  } catch(e) {
    console.warn(e);
  }
};

proto.getMapCanvas = function(map) {
  const viewport = map ? map.getViewport() : $(`#${this.maps_container} .g3w-map`).last().children('.ol-viewport')[0];
  return $(viewport).children('canvas')[0];
};

proto.getProjection = function() {
  return this.project.getProjection();
};

proto.isMapHidden = function() {
  return this.state.hidden;
};

proto.isAxisOrientationInverted = function() {
  return this.getProjection().getAxisOrientation() === 'neu' ? true : false;
};

proto.getCrs = function() {
  return this.getProjection().getCode();
};

proto.getViewerElement = function() {
  return this.viewer.map.getTargetElement();
};

proto.getViewport = function() {
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
  return this.getMap().getLayers().getArray().find(lyr => lyr.get('name') === name);
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

proto.createMapControl = function(type, {
  id,
  visible,
  add     = true,
  toggled = false,
  options = {},
} = {}) {
  const control = CONTROLS[type] ? new CONTROLS[type]({ type, toggled, ...options }) : undefined;
  if (undefined === visible) {
    visible = (control.isVisible ? control.isVisible() : true)
  }
  if (control) {
    this.addControl(id || type, type, control, add, visible);
  }
  return control;
};

proto.addScaleLineUnits = function(units=[]) {
  units.forEach(unit => this.state.mapunits.push(unit));
};

proto.changeScaleLineUnit = function(unit) {
  const scalelinecontrol = this.getMapControlByType({
    type: 'scaleline'
  });
  scalelinecontrol && scalelinecontrol.getOlControl().setUnits(unit);
};

proto.showAddLayerModal = function() {
  this.emit('addexternallayer');
};

proto._checkMapControls = function() {
  this._changeMapMapControls.forEach(({ control, getLayers }) => { control.change(getLayers()); });
};

proto._setupControls = function() {
  const baseLayers = getMapLayersByFilter({ BASELAYER: true });

  this.getMapLayers().forEach(mapLayer => mapLayer.getSource().setAttributions(this.getApplicationAttribution()));

  // check if base layer is set. If true add attribution control
  if (this.getApplicationAttribution() || baseLayers.length) {
    const attributionControl = new ol.control.Attribution({
      collapsible: false,
      target: 'map_footer_left'
    });
    this.getMap().addControl(attributionControl);
  }

  // skip when no controls
  if (!this.config || !this.config.mapcontrols) {
    return;
  }

  // BACKCOMP (g3w-admin < v3.7.0)
  const mapcontrols = Array.isArray(this.config.mapcontrols)
    ? this.config.mapcontrols.reduce((a, v) => { a[v] = {}; return a; }, {}) // convert `initConfig.group.mapcontrols` from an array of strings to a key-value config Object (eg. ["geocoding"] --> "geocoding" = {})
    : this.config.mapcontrols;

  Object
    .entries(mapcontrols)
    .forEach(([controlType, config={}]) => {
      let control;
      switch (controlType) {

        case 'reset':
          if (!isMobile.any) {
            control = new ResetControl({ type: 'reset' });
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
            if (this.getEpsg() !== 'EPSG:4326') {
              const mapEspg = this.getEpsg();
              const coordinateLabels = ['Lng', 'Lat'];
              const crs = this.getCrs();
              control = this.createMapControl(controlType, {
                add: false,
                options: {
                  target: 'mouse-position-control-epsg-4326',
                  coordinateFormat(coordinate) {
                    coordinate = ol.proj.transform(coordinate, mapEspg, 'EPSG:4326');
                    return ol.coordinate.format(coordinate, `\u00A0${coordinateLabels[0]}: {x}, ${coordinateLabels[1]}: {y}\u00A0\u00A0 [${crs}]\u00A0`, 4);
                  },
                  undefinedHTML: false,
                  projection: this.getCrs()
                }
              })
            }
          }
          break;

        case 'screenshot':
        case 'geoscreenshot':
          if (!isMobile.any ) {
            control = this.createMapControl(controlType, {
              options: {
                layers: [...MapLayersStoresRegistry.getLayers(), ...this._externalLayers],
                onclick: this._handlePrint.bind(this, controlType)
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
          break;

        case 'querybypolygon':
        case 'querybbox':
        case 'querybydrawpolygon':
          if (!isMobile.any) {
            control = this.createMapControl(controlType, {
              options: {
                spatialMethod: 'intersects'
              }
            });
          }
          break;

        case 'streetview':
          // streetview
          control = this.createMapControl(controlType, {});
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
          if (!isMobile.any && this.config.overviewproject && this.config.overviewproject.gid) {
            ProjectsRegistry
              .getProject(this.config.overviewproject.gid)
              .then(project => {
                //create a view for overview map
                const map = this.getMap();
                const view = new ol.View(this._calculateViewOptions({ project, width: 200, height: 150 })); // at moment hardcoded
                view.on('change:center', function() {
                  const current = view.getCenter();
                  const center  = map.getView().constrainCenter(current);
                  if (center[0] !== current[0] || center[1] !== current[1]) {
                    view.setCenter(center);
                  }
                });
                control = this.createMapControl(controlType, {
                  add: false,
                    options: {
                      view,
                      position:      'bl',
                      collapsed:     false,
                      className:     'ol-overviewmap ol-custom-overviewmap',
                      collapseLabel: $(`<span class="${GUI.getFontClass('arrow-left')}"></span>`)[0],
                      label:         $(`<span class="${GUI.getFontClass('arrow-right')}"></span>`)[0],
                      layers:        this.getOverviewMapLayers(project),
                    }
                });
                /** @since 3.10.0 Move another bottom left map controls bottom to a left of overview control**/
                document.querySelector('.g3w-map-controls-left-bottom').style.left = '230px';
                const observer = new MutationObserver((mutations) => {
                  mutations.forEach((mutation) => {
                    if ("class" === mutation.attributeName) {
                      document.querySelector('.g3w-map-controls-left-bottom').style.left = mutation.target.classList.contains('ol-collapsed') ? '50px' : '230px';
                    }
                  });
                });
                observer.observe(document.querySelector('.ol-custom-overviewmap'), {attributes: true});
              })
          }
          break;

        case 'geocoding':
        case 'nominatim':
          control = this.createMapControl(controlType, {
            add: false,
            options: {
              config
            }
          });
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

        /**
         * @since 3.8.0
         */
        case 'zoomhistory':
          control = this.createMapControl(controlType, { add: false });
          this._addControlToMapControlsLeftBottom(control);
          break;

      }
  });
  return this.getMapControls()
};

/**
 *  Set ZIndex layer from fa stack
 */
proto.setZIndexLayer = function({layer, zindex=this.getMap().getLayers().getLength()}={}) {
  layer && layer.setZIndex(zindex);
};

/**
 *
 * Get map stack layer position
 */
proto.getLayerZindex = function(layer) {
  return layer && layer.getZIndex();
};

proto.getCenter = function() {
  const map = this.getMap();
  return map.getView().getCenter();
};

/**
 *
 *method to zoom to feature
 */
proto.zoomToFid = async function(zoom_to_fid='', separator='|') {
  const [layerId, fid] = zoom_to_fid.split(separator);
  if (layerId !== undefined && fid !== undefined) {
    const layer = this.project.getLayerById(layerId);
    const {data=[]}= await DataRouterService.getData('search:fids', {
      inputs: {
        layer,
        fids:[fid]
      },
      outputs: {
        show: {
          loading: false,
          condition({data=[]}={}) {
            return data[0] && data[0].features.length > 0;
          }
        }
      }
    });
    const feature = data[0] && data[0].features[0];
    feature && this.zoomToFeatures([feature]);
  }
};

/**
 * Method to handele ztf url parameter
 * @param zoom_to_feature
 */
proto.handleZoomToFeaturesUrlParameter = async function({zoom_to_features='', search_endpoint='api'} = {}) {
  try {
    const [layerNameorIdorOrigname, fieldsValuesSearch] = zoom_to_features.split(':');
    if (layerNameorIdorOrigname && fieldsValuesSearch) {
      const projectLayer = this.project.getLayers().find(layer =>
        layer.id === layerNameorIdorOrigname ||
        layer.name === layerNameorIdorOrigname ||
        layer.origname === layerNameorIdorOrigname
      );
      if (projectLayer) {
        const layer = this.project.getLayerById(projectLayer.id);
        const filter = createFilterFromString({
          layer,
          search_endpoint,
          filter: fieldsValuesSearch
        });
        const {data} = await DataRouterService.getData('search:features', {
          inputs: {
            layer,
            filter,
            search_endpoint
          },
          outputs: {
            show: {
              loading: false
            }
          }
        });
        data && data[0] && data[0].features && this.zoomToFeatures(data[0].features)
      }
    }
  } catch(err) {
    console.log(err)
  }
};

proto.getMapExtent = function() {
  const map = this.getMap();
  return map.getView().calculateExtent(map.getSize());
};

/**
 * @param url
 * @param epsg cordinate referece system (since 3.8.0)
 * 
 * @returns {string}
 */
proto.addMapExtentUrlParameterToUrl = function(url, epsg) {
  url = new URL(url);
  url.searchParams.set(
    'map_extent',
    (
      undefined !== epsg && this.getEpsg() !== epsg
        ? ol.proj.transformExtent(this.getMapExtent(), this.getEpsg(), epsg)
        : this.getMapExtent()
    ).toString()
  );
  return url.toString()
};

proto.getMapExtentUrl = function() {
  const url = new URL(location.href);
  const map_extent = this.getMapExtent().toString();
  url.searchParams.set('map_extent', map_extent);
  return url.toString()
};

proto.createCopyMapExtentUrl = function() {
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
  // count the mapcontrol inside g3w-map-control container
  this._mapControls.forEach(control => {
    const map = this.getMap();
    this.state.mapControl.length+=control.mapcontrol ? control.id === 'zoom' ? 2 : 1: 0;
    control.control.changelayout ? control.control.changelayout(map) : null;
  });
  // add 1 id odd number
  this.state.mapControl.length += this.state.mapControl.length% 2;
  this.state.mapControl.grid = [];
  this._setMapControlsGrid(this.state.mapControl.length);
};

/**
 * Get filtrable layer. Get parameter to custom filter Object
 */
proto.filterableLayersAvailable = function(options={}) {
  return getMapLayersByFilter({
    FILTERABLE: true,
    SELECTED_OR_ALL: true,
  }, options).filter(layer => 'wfs' === layer.getProvider('filter').getName());
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
  (width == 0 || height == 0) ? this.state.mapcontrolDOM.css('z-index', 0) : this.state.mapcontrolDOM.css('z-index', 1);
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
          this.state.mapControl.currentIndex = this.state.mapControl.currentIndex === this.state.mapControl.grid.length - 1 ? this.state.mapControl.currentIndex : this.state.mapControl.currentIndex +1;
          changedAndMoreSpace.changed = true;
        } else {
          // check if there enough space to expand map controls
          /**
           Add 15 px of offset. Need to find a better solution in future
           */
          const nextHeight = 15 + (this.state.mapControl.currentIndex > 0 ? (this.state.mapControl.grid[this.state.mapControl.currentIndex -1].columns * this.state.mapcontrolSizes.minWidth) - mapControslHeight : mapControslHeight);
          if (freeSpace > nextHeight) {
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
          changedAndMoreSpace.space && setTimeout(()=> handleVerticalMapControlDOMElements());
        }
      };
      handleVerticalMapControlDOMElements();
    } else isMobile.any && this.setMapControlsAlignement('rv');
  }
};

/**
 *
 * @param control
 * @param visible
 * @private
 */
proto._setMapControlVisible = function({control, visible=true}) {
   control && control.setVisible(visible);
};

proto._addControlToMapControls = function(control, visible=true) {
  const controlElement = control.element;
  if (!visible) control.element.style.display = "none";
  $('.g3w-map-controls').append(controlElement);
};

/**
 * @since 3.8.0
 */
proto._addControlToMapControlsLeftBottom = function(control, visible=true) {
  if (!visible) {
    control.element.style.display = "none";
  }
  $('.g3w-map-controls-left-bottom').append(control.element);
};

proto.getMapControlByType = function({type}={}) {
  const mapControl = this._mapControls.find(mapControl => type === mapControl.type);
  return mapControl && mapControl.control;
};

/**
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

  this._mapControls.push({ id, type, control, visible, mapcontrol: addToMapControls && visible });

  control.on('controlclick', ({ target: mapcontrol }) => {
    const clickmap = mapcontrol.isClickMap && mapcontrol.isClickMap() || false;
    if (clickmap) {
      this._externalInteractions.forEach(interaction => interaction.setActive(false));
    }
    this.controlClick(mapcontrol, { clickmap })
  });

  const buttonControl = $(control.element).find('button');

  buttonControl.tooltip({
    placement: 'bottom',
    container: 'body',
    trigger: GUI.isMobile() ? 'click': 'hover'
  });

  // in case of mobile hide tooltip after click
  if (GUI.isMobile()) {
    buttonControl.on('shown.bs.tooltip', function() { setTimeout(() => $(this).tooltip('hide'), 600); });
  }

  if (addToMapControls) {
    this._addControlToMapControls(control, visible);
  } else {
    const $mapElement = $(`#${this.getMap().getTarget()}`);
    this._updateMapControlsLayout({ width: $mapElement.width(), height: $mapElement.height() });
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

/**
 * untoggle mapcontrol
 * @param close GUI content
 * @private
 */
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
proto.disableClickMapControls = function(bool=true) {
  this._mapControls.forEach(controlObj => {
    const {control} = controlObj;
    const clickmap = control.isClickMap ? control.isClickMap() : false;
    if (clickmap) {
      control.isToggled() && control.toggle();
      control[bool ? 'disable' : 'enable']();
    }
  })
};

proto.addMapLayers = function(mapLayers) {
  mapLayers.reverse().forEach(mapLayer => this.addMapLayer(mapLayer));
};

proto._setupCustomMapParamsToLegendUrl = function(bool=true) {
  if (bool) {
    const map = this.getMap();
    const size = map && map.getSize().filter(value => value > 0) || null;
    let bbox = size && size.length === 2 ? map.getView().calculateExtent(size) : this.project.state.initextent;
    // in case of axis orientation inverted i need to inverted the axis
    bbox = map.getView().getProjection().getAxisOrientation() === "neu" ? [bbox[1], bbox[0], bbox[3], bbox[2]] : bbox;
    const crs = this.getEpsg();
    //setup initial legend parameter
    this.getMapLayers().forEach(mapLayer => {
      mapLayer.setupCustomMapParamsToLegendUrl && mapLayer.setupCustomMapParamsToLegendUrl({
        crs,
        bbox
      })
    });
    this.emit('change-map-legend-params')
  }

};

proto.addMapLayer = function(mapLayer) {
  this._mapLayers.push(mapLayer);
  this.addLayerToMap(mapLayer)
};

proto.getMapLayerByLayerId = function(layerId) {
  return this.getMapLayers().find(mapLayer => {
    return mapLayer.getLayerConfigs().find(layer => layer.getId() === layerId);
  })
};

proto.getMapLayers = function() {
  return this._mapLayers;
};

proto.getBaseLayers = function() {
  return this.mapBaseLayers;
};

proto.getMapLayerForLayer = function(layer) {
  const multilayerId = `layer_${layer.getMultiLayerId()}`;
  const mapLayers = this.getMapLayers();
  const mapLayer = mapLayers.find(mapLayer => mapLayer.getId() === multilayerId);
  return mapLayer;
};

proto.getProjectLayer = function(layerId) {
  return MapLayersStoresRegistry.getLayerById(layerId);
};

proto._setSettings = function() {
  const {ZOOM} = MAP_SETTINGS;
  const maxScale = this.getScaleFromExtent(this.project.state.initextent);
  // settings maxScale
  ZOOM.maxScale =  ZOOM.maxScale > maxScale ? maxScale :  ZOOM.maxScale;
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
  const zoom_to_fid = searchParams.get('zoom_to_fid');
  const zoom_to_features = searchParams.get('ztf'); // zoom to features
  const lat_lon = searchParams.get('lat') && searchParams.get('lon') && {
    lat: 1*searchParams.get('lat'),
    lon:1*searchParams.get('lon')
  };
  const x_y = searchParams.get('x') && searchParams.get('y') && {
    x: 1*searchParams.get('x'),
    y: 1*searchParams.get('y')
  };
  if (zoom_to_fid) this.zoomToFid(zoom_to_fid);
  else if (zoom_to_features) this.handleZoomToFeaturesUrlParameter({zoom_to_features});
  else if (lat_lon && !Number.isNaN(lat_lon.lat) && !Number.isNaN(lat_lon.lon)) {
    setTimeout(()=>{
      const geometry = new ol.geom.Point(ol.proj.transform([lat_lon.lon, lat_lon.lat], 'EPSG:4326', this.getEpsg()));
      if (geometry.getExtent())
      this.zoomToGeometry(geometry)
    })
  } else if (x_y && !Number.isNaN(x_y.x) && !Number.isNaN(x_y.y))
    setTimeout(()=> {
      const geometry = new ol.geom.Point([x_y.x, x_y.y]);
      this.zoomToGeometry(geometry);
    });
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
  this.viewer = new OlMapViewer({
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

  /**
   *
   * Register map addLayer
   *
   */
  this.viewer.map.getLayers().on('add', evt => {
    const {element:layer} = evt;
    const basemap =  layer.get('basemap');
    const position = layer.get('position');
    let zindex = basemap && 0;
    if (position && position === 'bottom') zindex = 0;
    zindex = this.setLayerZIndex({
      layer,
      zindex
    });
    this.moveDefaultLayersOnTop(zindex);
  });

  this.viewer.map.getLayers().on('remove', evt => {
    const {element:layer}= evt;
    const layerZIndex = layer.getZIndex();
    if (layerZIndex === this.layersCount) this.layersCount-=1;
  })
};

proto.getMapUnits = function() {
  return this.state.mapUnits;
};

proto._removeListeners = function() {
  this._setBaseLayerListenerKey && this.project.un('setBaseLayer', this._setBaseLayerListenerKey);
};

// remove all events of layersStore
proto._removeEventsKeysToLayersStore = function(store) {
  const id = store.getId();
  if (this._layersStoresEventKeys[id]) {
    this._layersStoresEventKeys[id].forEach(evt => { Object.entries(evt).forEach(([event, key]) => store.un(event, key)); });
    delete this._layersStoresEventKeys[id];
  }
};

// register all events of layersStore and relative keys
proto._setUpEventsKeysToLayersStore = function(store) {
  const id = store.getId();
  // check if already store a key of events
  this._layersStoresEventKeys[id] = [];
  this._layersStoresEventKeys[id].push({
    addLayer: store.onafter('addLayer', l => { 'vector' === l.getType() && this.addLayerToMap(l.getMapLayer()) }),
  });
  this._layersStoresEventKeys[id].push({
    removeLayer: store.onafter('removeLayer', l => { 'vector' === l.getType() && this.viewer.map.removeLayer(l.getOLLayer()) }),
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
  this._setUpDefaultLayers();
};

//SETUP BASELAYERS
proto._setupBaseLayers = function() {
  const layers = getMapLayersByFilter({ BASELAYER: true });
  layers
    .forEach(layer => {
      const base = layer.getMapLayer();
      this.registerMapLayerListeners(base);
      this.mapBaseLayers[layer.getId()] = base;
    });
  Object
    .values(layers.length ? this.mapBaseLayers : {})
    .reverse()
    .forEach(layer => {
      layer.update(this.state, this.layersExtraParams);
      this.addLayerToMap(layer);
  });
};

// SETUP MAPLAYERS
proto._setupMapLayers = function() {
  // get all geolayers exclude baselayers and eventually vector layers
  const layers = getMapLayersByFilter({ BASELAYER: false, VECTORLAYER: false });

  this._setMapProjectionToLayers(layers);

  let cache     = {};
  let mapLayers = [];

  Object
    .entries(
      // Group layers by multilayer property (from project config)
      // to speed up "qtimeseriesries" loading for single layers
      _.groupBy(layers, layer => {
        let id = layer.getMultiLayerId();
        if (layer.isQtimeseries()) {
          cache[id] = undefined === cache[id] ? 0 : cache[id] + 1;
          return `${id}_${cache[id]}`;
        }
        return id = undefined === cache[id] ? id : `${id}_${cache[id] + 1}`;
      })
    )
    .forEach(([id, layers]) => {
      const layer    = layers[0] || [];
      const mapLayer = layer.getMapLayer(
        {
          id: `layer_${id}`,
          projection: this.getProjection(),
          /** @since 3.9.1 */
          format: 1 === layers.length ? layer.getFormat() : null
        },
        1 === layers.length ? {} : this.layersExtraParams
      );
      layers.reverse().forEach(l => mapLayer.addLayer(l));
      mapLayers.push(mapLayer);
      this.registerMapLayerListeners(mapLayer);
    });

  this.addMapLayers(mapLayers);
  this.updateMapLayers();
};

//SETUP VECTORLAYERS
proto._setupVectorLayers = function() {
  const layers = getMapLayersByFilter({ VECTORLAYER: true });
  this._setMapProjectionToLayers(layers);
  layers.forEach(layer => { this.addLayerToMap(layer.getMapLayer()) })
};

proto._setUpDefaultLayers = function() {
  // follow the order that i want
  this.getMap().addLayer(this.defaultsLayers.highlightLayer);
  this.getMap().addLayer(this.defaultsLayers.selectionLayer);
};

/**
 * Method to set Default layers (selectionLayer, and highlightLayer)
 * always on top of layers stack of map to be always visible
 */
proto.moveDefaultLayersOnTop = function(zindex) {
  this.setZIndexLayer({
    layer: this.defaultsLayers.highlightLayer,
    zindex: zindex + 1
  });
  this.setZIndexLayer({
    layer: this.defaultsLayers.selectionLayer,
    zindex: zindex + 2
  });
};

proto.removeDefaultLayers = function() {
  this.defaultsLayers.highlightLayer.getSource().clear();
  this.defaultsLayers.selectionLayer.getSource().clear();
  this.getMap().removeLayer(this.defaultsLayers.highlightLayer);
  this.getMap().removeLayer(this.defaultsLayers.selectionLayer);
};

proto.setDefaultLayerStyle = function(type, style={}) {
  if (type && this.defaultsLayers[type]) this.defaultsLayers._style[type] = style;
};

proto.resetDefaultLayerStyle = function(type, style={}) {
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

proto.removeAllLayers = function() {
  this.viewer.removeLayers();
};

//set ad increase layerIndex
proto.setLayerZIndex = function({layer, zindex=this.layersCount+=1}) {
  layer.setZIndex(zindex);
  this.emit('set-layer-zindex', {
    layer,
    zindex
  });
  return zindex;
};

/**
 * Add olLayer to mapLayer
 * @param layer
 */
proto.addLayerToMap = function(layer) {
  const olLayer = layer.getOLLayer();
  olLayer && this.getMap().addLayer(olLayer);
};

/**
 * Setup mapProjection on each layer
 * 
 * @param { Array } layers
 */
proto._setMapProjectionToLayers = function(layers) {
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
  const layers = [];

  Object
    .entries(
      _.groupBy(
        project.getLayersStore().getLayers({ GEOLAYER: true, BASELAYER: false }),
        layer => layer.getMultiLayerId()
      )
    ).forEach(([id, _layers]) => {
      const mapLayer = new WMSLayer({
        url:   project.getWmsUrl(),
        id:    'overview_layer_' + id,
        tiled: _layers[0].state.tiled,
      });
      _layers.reverse().forEach(layer => mapLayer.addLayer(layer));
      layers.push(mapLayer.getOLLayer(true));
    });
  return layers.reverse();
};

/**
 * method to update MapLayer
 * @param mapLayer
 * @param options
 */
proto.updateMapLayer = function(mapLayer, options={force:false}, {showSpinner=true} = {}) {
  // if force adds g3w_time parameter to force request of map layer from server
  if (options.force) {
    options.g3w_time = Date.now();
  }
  if (showSpinner !== mapLayer.showSpinnerWhenLoading) {
    mapLayer.showSpinnerWhenLoading = showSpinner;
    this[showSpinner ? 'registerMapLayerLoadingEvents' : 'unregisterMapLayerLoadingEvents'](mapLayer);
  }
  mapLayer.update(this.state, options);
  return mapLayer;
};

// run update function on each mapLayer
proto.updateMapLayers = function(options={}) {
  this.getMapLayers().forEach(mapLayer => this.updateMapLayer(mapLayer, options));
  const baseLayers = this.getBaseLayers();
  //updatebase layer
  Object.values(baseLayers).forEach(baseLayer => baseLayer.update(this.state, this.layersExtraParams));
};

// register map Layer listeners of creation
proto.registerMapLayerListeners = function(mapLayer, projectLayer=true) {
  this.registerMapLayerLoadingEvents(mapLayer);
  //listen change filter token
  if (projectLayer && mapLayer.layers && Array.isArray(mapLayer.layers))
    mapLayer.layers.forEach(layer => {
      layer.onbefore('change', () => this.updateMapLayer(mapLayer, {force: true}));
      layer.on('filtertokenchange', () => this.updateMapLayer(mapLayer, {force: true}))
    });
  ///
};

/** Methods to register and unregister load map
 *
 * */
proto.registerMapLayerLoadingEvents = function(mapLayer) {
  mapLayer.on('loadstart', this._incrementLoaders);
  mapLayer.on('loadend', this._decrementLoaders);
  mapLayer.on('loaderror', this._mapLayerLoadError);
};

proto.unregisterMapLayerLoadingEvents = function(mapLayer) {
  mapLayer.off('loadstart', this._incrementLoaders );
  mapLayer.off('loadend', this._decrementLoaders );
  mapLayer.off('loaderror', this._mapLayerLoadError);
};

/**
 * End
 */

// unregister listeners of mapLayers creation
proto.unregisterMapLayerListeners = function(mapLayer, projectLayer=false) {
  this.unregisterMapLayerLoadingEvents(mapLayer);
  // try to remove layer filter token
  if (projectLayer && mapLayer.layers && Array.isArray(mapLayer.layers))
    mapLayer.layers.forEach(layer => {
      layer.un('change');
      layer.removeEvent('filtertokenchange')
    });
};

proto.setTarget = function(elId) {
  this.target = elId;
};

proto.getCurrentToggledMapControl = function() {
  const mapControl = this._mapControls.find(({control}) => control && control.isToggled && control.isToggled());
  return mapControl && mapControl.control;
};

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
proto.addInteraction = function(interaction, options={active:true, close:true}) {
  const {active=true} = options;
  const control = this.getCurrentToggledMapControl();
  const toggled = control && control.isToggled && control.isToggled() || false;
  const untoggleMapControls = control && control.isClickMap ? control.isClickMap() : true;
  untoggleMapControls && active && this._unToggleControls(options);
  this.getMap().addInteraction(interaction);
  interaction.setActive(active);
  this._externalInteractions.push(interaction);
  return {
    control,
    toggled// return current toggled map control if toggled
  }
};

proto.removeInteraction = function(interaction) {
  interaction && interaction.setActive(false);
  this.viewer.map.removeInteraction(interaction);
  this._externalInteractions = this._externalInteractions.filter(_interaction => interaction !== _interaction);
};

proto._watchInteraction = function(interaction) {
  interaction.on('change:active', e => {
    if ((e.target instanceof ol.interaction.Pointer) && e.target.getActive()) {
      this.emit('mapcontrol:active', e.target);
    }
  })
};

/**
 * Show map Info
 * @param info
 */
proto.showMapInfo = function({info, style} = {}) {
  this.state.map_info.info = info;
  this.state.map_info.style = style || this.state.map_info.style;
};

proto.hideMapInfo = function() {
  this.state.map_info.info = null;
  this.state.map_info.style = null;
};

proto.zoomTo = function(coordinate, zoom=6) {
  this.viewer.zoomTo(coordinate, zoom);
};

proto.goTo = function(coordinates,zoom) {
  const options = {
    zoom: zoom || 6
  };
  this.viewer.goTo(coordinates, options);
};

proto.goToRes = function(coordinates, resolution) {
  this.viewer.goToRes(coordinates, {
    resolution
  });
};

proto.getGeometryAndExtentFromFeatures = function(features=[]) {
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
    if (extent === undefined) extent = geometry.getExtent();
  } catch(err) {}
  return {
    extent,
    geometry
  }
};

proto.highlightFeatures = function(features, options={}) {
  const {geometry} = this.getGeometryAndExtentFromFeatures(features);
  //force zoom false
  options.zoom = false;
  this.highlightGeometry(geometry, options);
};

/**
 * Zoom methods
 */

proto.zoomToGeometry = function(geometry, options={highlight: false}) {
  const extent = geometry && geometry.getExtent();
  const {highlight} = options;
  if (highlight && extent) options.highLightGeometry = geometry;
  extent && this.zoomToExtent(extent, options);
};

proto.zoomToFeatures = function(features, options={highlight: false}) {
  let {geometry, extent} = this.getGeometryAndExtentFromFeatures(features);
  const {highlight} = options;
  if (highlight && extent) options.highLightGeometry = geometry;
  return extent && this.zoomToExtent(extent, options) || Promise.resolve();
};

/**
 * @param   { ol.extent }                                          extent
 * @param   {{ force?: boolean, highLightGeometry?: ol.geometry }} [options={}]
 * @returns { Promise<void> }
 */
proto.zoomToExtent = function(extent, options={}) {
  this.goToRes(
    ol.extent.getCenter(extent),
    this.getResolutionForZoomToExtent(extent, { force: options.force || false  })
  );
  if (options.highLightGeometry) {
    return this.highlightGeometry(options.highLightGeometry, { zoom: false, duration: options.duration });
  }
  return Promise.resolve();
};

proto.zoomToProjectInitExtent = function() {
  this.zoomToExtent(this.project.state.initextent);
};

/**
 * End zoom methods
 */

proto.compareExtentWithProjectMaxExtent = function(extent) {
  const projectExtent = this.project.state.extent;
  const inside = ol.extent.containsExtent(projectExtent, extent);
  return inside ? extent : projectExtent;
};

/**
 * @param   {[ minx: number, miny: number, maxx: number, maxy: number ]} extent
 * @param   {{ force?: boolean }} [options] if force is undefined calculate `resolution` from given `extent`
 * @returns {number} resolution (in pixels?)
 */
proto.getResolutionForZoomToExtent = function(extent, options={force:false}) {
  const map = this.getMap();

  // if outside project extent, return max resolution
  if (false === ol.extent.containsExtent(this.project.state.extent, extent)) {
    return map.getView().getResolutionForExtent(this.project.state.extent, map.getSize());
  }

  const extentResolution = map.getView().getResolutionForExtent(extent, map.getSize());            // resolution of request extent

  // retrive resolution from given `extent`
  if (true === options.force) {
    return extentResolution; 
  }

  // calculate main resolutions from map
  let resolution;
  const currentResolution = map.getView().getResolution();
  const maxResolution     = getResolutionFromScale(MAP_SETTINGS.ZOOM.maxScale, this.getMapUnits()); // max resolution of the map
  resolution = extentResolution > maxResolution ? extentResolution: maxResolution;
  resolution = (currentResolution < resolution) && (currentResolution > extentResolution) ? currentResolution : resolution;
  return resolution;
};

proto.goToBBox = function(bbox, epsg=this.getEpsg()) {
  bbox = epsg === this.getEpsg() ? bbox : ol.proj.transformExtent(bbox, epsg, this.getEpsg());
  this.viewer.fit(this.compareExtentWithProjectMaxExtent(bbox));
};

proto.goToWGS84 = function(coordinates,zoom) {
  coordinates = ol.proj.transform(coordinates,'EPSG:4326',this.project.state.crs.epsg);
  this.goTo(coordinates,zoom);
};

proto.extentToWGS84 = function(extent) {
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
*   - add: feature/features to selectionLayer. If selectionLayer doesn't exist create a  new vector layer.
*   - clear: remove selectionLayer
*   - remove: remove feature from selection layer. If no more feature are in selectionLayer it will be removed
* */
proto.setSelectionFeatures = function(action='add', options={}) {
  const {feature, color} = options;
  if (color) {
    this.setDefaultLayerStyle('selectionLayer', {
      color
    });
  }
  const source = this.defaultsLayers.selectionLayer.getSource();
  switch (action) {
    case 'add':
      source.addFeature(feature);
      break;
    case 'remove':
      source.removeFeature(feature);
      break;
    case 'update':
      const addedFeature = source.getFeatureById(feature.getId());
      addedFeature.setGeometry(feature.getGeometry());
      break;
    case 'clear':
      source.clear();
      break;
  }
};

proto.clearSelectionFeatures = function() {
  this.defaultsLayers.selectionLayer.getSource().clear();
};

/**
 * @since 3.9.0
 */
proto.setSelectionLayerVisible = function(visible=true) {
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
    const defaultStyle = function(feature) {
      let styles = [];
      const geometryType = feature.getGeometry().getType();
      const style = createSelectedStyle({
        geometryType,
        color,
        fill: false
      });
      styles.push(style);
      return styles;
    };
    const {ANIMATION} = MAP_SETTINGS;
    const highlight = (typeof options.highlight == 'boolean') ? options.highlight : true;
    const duration = options.duration || ANIMATION.duration;
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

/**
 * Force to referesh map
 * @param options
 */
proto.refreshMap = function(options={force: true}) {
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
proto._removeBaseLayers = function() {
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

proto.removeExternalLayers = function() {
  this._externalLayers.forEach(layer => { this.removeExternalLayer(layer.get('name')); });
  this._externalLayers = [];
};

proto.changeLayerVisibility = function({id, external=false, visible}) {
  const layer = this.getLayerById(id);
  if (layer) {
    layer.setVisible(visible);
    this.emit('change-layer-visibility', {id, visible});
  }
};

proto.changeLayerOpacity = function({id, opacity=1}={}) {
  const layer = this.getLayerById(id);
  layer && layer.setOpacity(opacity);
  this.emit('change-layer-opacity', {id, opacity});
};

proto.changeLayerMapPosition = function({id, position=MAP_SETTINGS.LAYER_POSITIONS.default}) {
  const layer = this.getLayerById(id);
  switch(position) {
    case 'top':
      layer.setZIndex(this.layersCount);
      break;
    case 'bottom':
      layer.setZIndex(0);
      break
  }
  this.emit('change-layer-position-map', {id, position});
};

/**
 * Remove external layer
 * 
 * @param name
 */
proto.removeExternalLayer = function(name) {
  const layer = this.getLayerByName(name);
  GUI.getService('queryresults').unregisterVectorLayer(layer);
  this.viewer.map.removeLayer(layer);
  const type = layer._type || 'vector';
  GUI.getService('catalog').removeExternalLayer({ name, type });
  if (type == 'wms') {
    this._externalMapLayers = this._externalMapLayers
      .filter(ext => {
        const found = ext.getId() === layer.id;
        if (found) this.unregisterMapLayerListeners(ext, layer.projectLayer);
        return !found;
      });
  }
  this._externalLayers = this._externalLayers.filter(ext => ext.get('id') !== layer.get('id'));
  this.unloadExternalLayer(layer);
  this.emit('remove-external-layer', name);
};

/**
 * Add external WMS layer to map
 * 
 * @param url
 * @param layers
 * @param name
 * @param projection
 * @param position
 * @returns {Promise<unknown>}
 */
proto.addExternalWMSLayer = function({
  url,
  layers,
  name,
  epsg = this.getEpsg(),
  position = MAP_SETTINGS.LAYER_POSITIONS.default,
  opacity,
  visible=true
} = {}) {

  const projection = ol.proj.get(epsg);

  return new Promise((resolve, reject) => {
    const { wmslayer, olLayer } = createWMSLayer({ name, url, layers, projection });

    wmslayer.once('loadend',   ()  => { resolve(wmslayer) });
    wmslayer.once('loaderror', err => { reject(err); });

    // add to map
    this.addExternalLayer(olLayer, { position, opacity, visible });

    // register and dispatch layer add event
    this.addExternalMapLayer(wmslayer, false);
  })
};

/**
 *
 * Return extanla layers added to map
 * @returns {[]|*[]|T[]}
 */
proto.getExternalLayers = function() {
  return this._externalLayers;
};

proto.addExternalMapLayer = function(layer, projectLayer=false) {
  this._externalMapLayers.push(layer);
  this.registerMapLayerListeners(layer, projectLayer);
};

/**
 * Add an external layer to the map (eg. ZIP, KMZ, GPX, ...)
 * 
 * @param { ol.layer.Vector | ol.layer.Image | unknown } externalLayer
 * @param { Object }  options
 * @param { unknown } options.position
 * @param { number }  options.opacity
 * @param { boolean } options.visible
 * @param { unknown } options.crs
 * @param { unknown } options.type
 * @param { unknown } options.download
 * @param { string }  options.downloadUrl (since 3.8.3) an alternate external server url where to perfom download.
 * 
 * @returns { Promise<unknown> }
 */
proto.addExternalLayer = async function(externalLayer, options={}) {
  let vectorLayer,
    name,
    data,
    color, // <-- FIXME: this variable seems to be declared twice
    style,
    type,
    crs;

  const {
    position = MAP_SETTINGS.LAYER_POSITIONS.default,
    opacity  = 1,
    visible  = true
  } = options;

  const { map }            = this.viewer;
  const catalogService     = GUI.getService('catalog');
  const QueryResultService = GUI.getService('queryresults');

  /**
   * EXTERNAL VECTOR LAYER
   */
  if (externalLayer instanceof ol.layer.Vector) {
    let color;

    if (undefined === externalLayer.get('id')) {
      externalLayer.set('id', uniqueId());
    }

    vectorLayer           = externalLayer;
    vectorLayer.filter    = { // used by `selection` for query result purpose ?
      active: false           // UNUSUED - it means not yet implemented?
    };
    vectorLayer.selection = {
      active: false,
      features: []
    };

    try {
      const style = externalLayer.getStyle();
      color = style._g3w_options ? style._g3w_options.color : 'blue'; //setted by geo utils create style function
    } catch(err) {
      color = 'blue'
    }

    name = vectorLayer.get('name') || vectorLayer.get('id');
    type = 'vector';
    externalLayer = {
      id: externalLayer.get('id'),
      name,
      projectLayer: false,
      title: name,
      removable: true,
      external: true,
      crs: options.crs,
      type: options.type,
      _type: type,
      download: options.download || false,
      /**
       * An alternate (external) server url where to perfom download.
       * 
       * @example
       * 
       * ```js
       * GUI.getService('map').addExternalLayer(layer, {
       *   type: 'geojson',
       *   downloadUrl:  _<URL WHERE DOWNLOAD FILE>_
       * });
       * ```
       * 
       * @since 3.8.3
       */
      downloadUrl: options.downloadUrl,
      visible,
      checked: true,
      position,
      opacity,
      color,
      filter: vectorLayer.filter,
      selection: vectorLayer.selection,
      /**
       * @since 3.8.0
       */
      tochighlightable: false
    };
  }

  /**
   * EXTERNAL IMAGE LAYER
   */
  else if (externalLayer instanceof ol.layer.Image) {
    type = 'wms';
    name = externalLayer.get('name');
    externalLayer.id           = externalLayer.get('id');
    externalLayer.removable    = true;
    externalLayer.projectLayer = false;
    externalLayer.name         = name;
    externalLayer.title        = name;
    externalLayer._type        = type;
    externalLayer.opacity      = opacity;
    externalLayer.position     = position;
    externalLayer.external     = true;
    externalLayer.checked      = visible;
  }

  /**
   * UKNOWN EXTERNAL LAYER TYPE ?
   */
  else {
    name  = externalLayer.name;
    type  = externalLayer.type;
    crs   = externalLayer.crs;
    data  = externalLayer.data;
    color = externalLayer.color;
  }

  const loadExternalLayer = (layer, type) => {
    // skip if is not a valid layer
    if (!layer) {
      return Promise.reject();
    }

    let extent;

    if (type === 'vector') {
      const features = layer.getSource().getFeatures();
      if (features.length) {
        let id = 0;
        // add id value
        features.forEach(feature => { feature.setId(id++); });
        externalLayer.geometryType = features[0].getGeometry().getType();
        externalLayer.selected = false;
      }
      extent = layer.getSource().getExtent();
      externalLayer.bbox = { minx: extent[0], miny: extent[1], maxx: extent[2], maxy: extent[3] };
    }

    layer.set('position', position);
    layer.setOpacity(opacity);
    layer.setVisible(visible);

    map.addLayer(layer);

    this._externalLayers.push(layer);

    QueryResultService.registerVectorLayer(layer);

    catalogService.addExternalLayer({ layer: externalLayer, type });

    if (extent) {
      map.getView().fit(extent);
    }

    this.loadExternalLayer(layer);

    return Promise.resolve(layer);
  };

  const layer = this.getLayerByName(name);

  if (!layer) {
    switch (type) {
      case 'vector': return loadExternalLayer(vectorLayer, type);
      case 'wms':    return loadExternalLayer(externalLayer, type);
      default:
        vectorLayer = await createVectorLayerFromFile({ name, type, crs, mapCrs, data, style });
        return loadExternalLayer(vectorLayer);
    }
  } else {
    GUI.notify.warning("layer_is_added", false);
  }

};

proto.setExternalLayerStyle = function(color, field) {
  color = color.rgba;
  color = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ','  + color.a + ')';
  const defaultStyle = {
    'Point': new ol.style.Style({
      image: new ol.style.Circle({
        fill: new ol.style.Fill({ color }),
        radius: 5,
        stroke: new ol.style.Stroke({ color, width: 1 })
      })
    }),
    'LineString': new ol.style.Style({
      stroke: new ol.style.Stroke({ color, width: 3 })
    }),
    'Polygon': new ol.style.Style({
      fill: new ol.style.Fill({ color: 'rgba(255,255,255,0.5)' }),
      stroke: new ol.style.Stroke({ color, width: 3 })
    }),
    'MultiPoint': new ol.style.Style({
      image: new ol.style.Circle({
        fill: new ol.style.Fill({ color }),
        radius: 5,
        stroke: new ol.style.Stroke({ color, width: 1 })
      })
    }),
    'MultiLineString': new ol.style.Style({
      stroke: new ol.style.Stroke({ color, width: 3 })
    }),
    'MultiPolygon': new ol.style.Style({
      fill: new ol.style.Fill({ color: 'rgba(255,255,255,0.5)' }),
      stroke: new ol.style.Stroke({ color, width: 3 })
    })
  };
  const styleFunction = function(feature, resolution) {
    const func = feature.getStyleFunction();
    return func ? func.call(feature, resolution) : defaultStyle[feature.getGeometry().getType()];
  };
  return styleFunction;
};

/**
 * @since 3.8.3
 */
proto._handlePrint = async function(controlType) {
  // Start download
  const download_id = ApplicationService.setDownload(true);
  try {
    const blobImage = await this.createMapImage();
    if ('screenshot' === controlType) {
      saveAs(blobImage, `map_${Date.now()}.png`);
    } else {
      // GeoTIFF
      saveAs(
        await getGeoTIFFfromServer({
          url: `/${this.project.getType()}/api/asgeotiff/${this.project.getId()}/`,
          method: "POST",
          params: {
            image: blobImage,
            csrfmiddlewaretoken: this.getCookie('csrftoken'),
            bbox: this.getMapBBOX().toString()
          },
        }),
        `map_${Date.now()}.tif`
      );
    }
  } catch (err) {
    GUI.showUserMessage({
      type: 'SecurityError' === err.name ? 'warning' : 'alert',
      message: 'SecurityError' === err.name ? 'mapcontrols.screenshot.securityError' : 'mapcontrols.screenshot.error',
      autoclose: false
    });
  }
  // End download
  ApplicationService.setDownload(false, download_id);
  return true;
};

/**
 * Wrapper for native Open Layers controls 
 */
function OLControl(type) {
    function _ctor(options={}) {

    this._control     = null;
    this.positionCode = options.position || 'tl';

    switch (options.type) {
      case 'zoom':         this._control = new ol.control.Zoom(options); break;
      case 'zoomtoextent': this._control = new ol.control.ZoomToExtent(options); break;
      case 'scaleline':    this._control = new ol.control.ScaleLine(options); break;
      case 'overview':     this._control = new ol.control.OverviewMap(options); break;
    }

    $(this._control.element).addClass("ol-control-"+this.positionCode);

    this.offline = true;

    /**
     * @returns { ol.control }
     */
    this.getOlControl = function() {
      return this._control;
    };

    this.getPosition = function(pos) {
      pos = pos || this.positionCode;
      return {
        top:  (pos.indexOf('t') > -1) ? true : false,
        left: (pos.indexOf('l') > -1) ? true : false,
      };
    };

    this.layout = function(map) {
      //No map is passed
      if (!map) {
        return;
      }
      const previusControls = $(map.getViewport()).find(`.ol-control-${this.positionCode}`);
      if (previusControls.length) {
        const position     =  this.getPosition();
        let previusControl = previusControls.last();
        const offset       = position.left ? previusControl.position().left : previusControl.position().right;
        const hWhere       = position.left ? 'left' : 'right';
        const hOffset      = $(this.element).position()[hWhere] + offset + previusControl[0].offsetWidth + 2;
        $(this.element).css(hWhere, hOffset+'px');
      }
    };

    this.changelayout = function() {};

    this.showHide = function() {
      $(this.element).toggle();
    };

    this.setMap = function(map) {
      this.layout(map);
      this._control.setMap(map);
    };

    ol.control.Control.call(this, {
      element: this._control.element
    });

  }

  ol.inherits(_ctor, ol.control.Control);
  return _ctor;
}

/**
 * Wrapper for custom Vue's SFC controls
 * 
 * @since 3.9.0
 */
function VueControl(type) {
  function _ctor(options = {}) {
    const opts    = { name: type };
    const project = GUI.getService('map').getProject();
    let component;

    switch(type) {

      /** ORIGINAL SOURCE: src/app/g3w-ol/controls/zoomhistorycontrol.js@v3.8.0 */
      case 'zoomhistory':
        component     = Vue.extend(MapControlZoomHistory);
        opts.element  = new component();
        opts.tipLabel = "sdk.mapcontrols.addlayer.tooltip";
      break;

      /** ORIGINAL SOURCE: src/app/g3w-ol/controls/geocodingcontrol.js@v3.8.0 */
      case 'nominatim':
      case 'geocoding':
        component = Vue.extend(MapControlGeocoding);
        opts.element = new component({
          propsData: {
            ...options.config, // pass configuration from server
            placeholder:    (undefined !== options.placeholder       ? options.placeholder       : "mapcontrols.geocoding.placeholder")        || 'Città, indirizzo ... ',
            noresults:      (undefined !== options.noresults         ? options.noresults         : "mapcontrols.geocoding.noresults")          || 'Nessun risultato ',
            // notresponseserver:     (undefined !== options.notresponseserver ? options.notresponseserver : "mapcontrols.geocoding.notresponseserver")  || 'Il server non risponde', // <-- TODO ?
            limit:          options.limit || 5,
            viewbox:        (undefined !== options.bbox              ? options.bbox              : project.state.initextent || project.state.extent),
            mapCrs:         (undefined !== options.mapCrs            ? options.mapCrs            : project.state.crs.epsg),
          }
        });
        opts.offline = false;

      break;
    }
    opts.element = opts.element.$mount().$el
    Control.call(this, opts);
  }
  ol.inherits(_ctor, Control);
  return _ctor;
}

module.exports = {

  MapService,

  /** ORIGINAL SOURCE: src/app/gui/map/control/factory.js@v3.8.0 */
  ControlsFactory: {
    create(options={}) {
      return CONTROLS[options.type] ? new CONTROLS[options.type](options) : undefined;
    }
  },
};