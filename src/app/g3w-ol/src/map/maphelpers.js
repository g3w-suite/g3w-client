import { defaults as defaultsControl } from 'ol/control';
import { defaults as defaultsInteaction, DragRotate } from 'ol/interaction';
import { View, Map } from 'ol';
import Projections from '../projection/projections';
import BaseLayers from '../layers/bases';

const _Viewer = function (opts = {}) {
  const controls = defaultsControl({
    attribution: false,
    zoom: false,
  });

  const interactions = defaultsInteaction()
    .extend([
      new DragRotate(),
    ]);
  interactions.removeAt(1);// remove douclickzoom
  const view = opts.view instanceof View ? opts.view : new View(opts.view);
  const options = {
    controls,
    interactions,
    ol3Logo: false,
    view,
    keyboardEventTarget: document,
  };
  if (opts.id) {
    options.target = opts.id;
  }
  Projections.setApplicationProjections();
  const map = new Map(options);
  this.map = map;
};

_Viewer.prototype.destroy = function () {
  if (this.map) {
    this.map.dispose();
    this.map = null;
  }
};

_Viewer.prototype.getView = function () {
  return this.map.getView();
};

_Viewer.prototype.updateMap = function (mapObject) {};

_Viewer.prototype.updateView = function () {};

_Viewer.prototype.getMap = function () {
  return this.map;
};

_Viewer.prototype.setTarget = function (id) {
  this.map.setTarget(id);
};

_Viewer.prototype.zoomTo = function (coordinate, zoom) {
  const view = this.map.getView();
  view.setCenter(coordinate);
  view.setZoom(zoom);
};

_Viewer.prototype.goTo = function (coordinates, options = {}) {
  const animate = options.animate || true;
  const zoom = options.zoom || false;
  const view = this.map.getView();
  let panAnimation;
  const duration = 300;
  let zoomAnimation;
  if (animate) {
    panAnimation = {
      duration,
      center: coordinates,
    };
    if (zoom) {
      zoomAnimation = {
        duration,
        zoom,
      };
    } else {
      zoomAnimation = {
        duration,
        resolution: view.getResolution(),
      };
    }
    view.animate(panAnimation, zoomAnimation);
  } else {
    view.setCenter(coordinates);
    if (zoom) {
      view.setZoom(zoom);
    }
  }
};

_Viewer.prototype.goToRes = function (coordinates, options = {}) {
  const animate = options.animate || true;
  const view = this.map.getView();
  const resolution = options.resolution || view.getResolution();
  let panAnimation;
  let zoomAnimation;
  if (animate) {
    panAnimation = {
      duration: 200,
      center: coordinates,
    };
    zoomAnimation = {
      duration: 200,
      resolution,
    };
    view.animate(panAnimation, zoomAnimation);
  } else {
    view.setCenter(coordinates);
    view.setResolution(resolution);
  }
};

_Viewer.prototype.fit = function (geometry, options = {}) {
  const view = this.map.getView();
  const animate = options.animate || true;
  let panAnimation;
  let zoomAnimation;
  const duration = 200;
  if (animate) {
    panAnimation = view.animate({
      duration,
      center: view.getCenter(),
    });
    zoomAnimation = view.animate({
      duration,
      resolution: view.getResolution(),
    });
  }

  if (options.animate) {
    delete options.animate; //
  }
  options.constrainResolution = options.constrainResolution === undefined && true || options.constrainResolution;
  options.size = this.map.getSize();
  view.fit(geometry, options);
};

_Viewer.prototype.getZoom = function () {
  const view = this.map.getView();
  return view.getZoom();
};

_Viewer.prototype.getResolution = function () {
  const view = this.map.getView();
  return view.getResolution();
};

_Viewer.prototype.getCenter = function () {
  const view = this.map.getView();
  return view.getCenter();
};

_Viewer.prototype.getBBOX = function () {
  return this.map.getView().calculateExtent(this.map.getSize());
};

_Viewer.prototype.getLayerByName = function (layerName) {
  const layers = this.map.getLayers();
  const length = layers.getLength();
  for (let i = 0; i < length; i++) {
    if (layerName === layers.item(i).get('name')) {
      return layers.item(i);
    }
  }
  return null;
};

_Viewer.prototype.removeLayerByName = function (layerName) {
  let layer = this.getLayerByName(layerName);
  if (layer) {
    this.map.removeLayer(layer);
    layer = undefined;
  }
};

_Viewer.prototype.getActiveLayers = function () {
  const activelayers = [];
  this.map.getLayers().forEach((layer) => {
    const props = layer.getProperties();
    if (props.basemap !== true && props.visible) {
      activelayers.push(layer);
    }
  });

  return activelayers;
};

_Viewer.prototype.removeLayers = function () {
  this.map.getLayers().clear();
};

_Viewer.prototype.getLayersNoBase = function () {
  const layers = [];
  this.map.getLayers().forEach((layer) => {
    const props = layer.getProperties();
    if (props.basemap != true) {
      layers.push(layer);
    }
  });

  return layers;
};

_Viewer.prototype.addBaseLayer = function (type) {
  let layer;
  type ? layer = BaseLayers[type] : layer = BaseLayers.BING.Aerial;
  this.map.addLayer(layer);
};

_Viewer.prototype.changeBaseLayer = function (layerName) {
  const baseLayer = this.getLayerByName(layername);
  const layers = this.map.getLayers();
  layers.insertAt(0, baseLayer);
};

const MapHelpers = {
  createViewer(opts = {}) {
    return new _Viewer(opts);
  },
};

export default MapHelpers;
