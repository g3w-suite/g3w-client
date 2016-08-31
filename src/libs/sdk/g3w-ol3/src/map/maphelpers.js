BaseLayers = require('../layers/bases');

var MapHelpers = {
  createViewer: function(opts){
    return new _Viewer(opts);
  }
};

var _Viewer = function(opts){
  var controls = ol.control.defaults({
    attributionOptions: {
      collapsible: false
    },
    zoom: false,
    attribution: false
  });//.extend([new ol.control.Zoom()]);
  
  var interactions = ol.interaction.defaults()
    .extend([
      new ol.interaction.DragRotate()
    ]);
  interactions.removeAt(1) // rimuovo douclickzoom
  
  var view;
  if (opts.view instanceof ol.View) {
    view = opts.view;
  }
  else {
    view = new ol.View(opts.view);
  }
  var options = {
    controls: controls,
    interactions: interactions,
    ol3Logo: false,
    view: view,
    keyboardEventTarget: document
  };
  if (opts.id){
    options.target = opts.id;
  }
  var map  = new ol.Map(options);
  this.map = map;
};

_Viewer.prototype.destroy = function(){
  if (this.map) {
    this.map.dispose();
    this.map = null
  }
};

_Viewer.prototype.getView = function() {
  return this.map.getView();
}

_Viewer.prototype.updateMap = function(mapObject){};

_Viewer.prototype.updateView = function(){};

_Viewer.prototype.getMap = function(){
  return this.map;
};

_Viewer.prototype.setTarget = function(id){
  this.map.setTarget(id);
};

_Viewer.prototype.goTo = function(coordinates, options){
  var options = options || {};
  var animate = options.animate || true;
  var zoom = options.zoom || false;
  var view = this.map.getView();
  
  if (animate) {
    var panAnimation = ol.animation.pan({
      duration: 500,
      source: view.getCenter()
    });
    var zoomAnimation = ol.animation.zoom({
      duration: 500,
      resolution: view.getResolution()
    });
    this.map.beforeRender(panAnimation,zoomAnimation);
  }
  
  view.setCenter(coordinates);
  if (zoom) {
    view.setZoom(zoom);
  }
};

_Viewer.prototype.goToRes = function(coordinates, resolution){
  var options = options || {};
  var animate = options.animate || true;
  var view = this.map.getView();
  
  if (animate) {
    var panAnimation = ol.animation.pan({
      duration: 300,
      source: view.getCenter()
    });
    var zoomAnimation = ol.animation.zoom({
      duration: 300,
      resolution: view.getResolution()
    });
    this.map.beforeRender(panAnimation,zoomAnimation);
  }

  view.setCenter(coordinates);
  view.setResolution(resolution);
};

_Viewer.prototype.fit = function(geometry, options){
  var view = this.map.getView();
  
  var options = options || {};
  var animate = options.animate || true;
  
  if (animate) {
    var panAnimation = ol.animation.pan({
      duration: 300,
      source: view.getCenter()
    });
    var zoomAnimation = ol.animation.zoom({
      duration: 300,
      resolution: view.getResolution()
    });
    this.map.beforeRender(panAnimation,zoomAnimation);
  }
  
  if (options.animate) {
    delete options.animate; // non lo passo al metodo di OL3 perché è un'opzione interna
  }
  options.constrainResolution = options.constrainResolution || true;
  
  view.fit(geometry,this.map.getSize(),options);
};

_Viewer.prototype.getZoom = function(){
  var view = this.map.getView();
  return view.getZoom();
};

_Viewer.prototype.getResolution = function(){
  var view = this.map.getView();
  return view.getResolution();
};

_Viewer.prototype.getCenter = function(){
  var view = this.map.getView();
  return view.getCenter();
};

_Viewer.prototype.getBBOX = function(){
  return this.map.getView().calculateExtent(this.map.getSize());
};

_Viewer.prototype.getLayerByName = function(layerName) {
  var layers = this.map.getLayers();
  var length = layers.getLength();
  for (var i = 0; i < length; i++) {
    if (layerName === layers.item(i).get('name')) {
      return layers.item(i);
    }
  }
  return null;
};

_Viewer.prototype.removeLayerByName = function(layerName){
  var layer = this.getLayerByName(layerName);
  if (layer){
    this.map.removeLayer(layer);
    delete layer;
  }
};

_Viewer.prototype.getActiveLayers = function(){
  var activelayers = [];
  this.map.getLayers().forEach(function(layer) {
    var props = layer.getProperties();
    if (props.basemap != true && props.visible){
       activelayers.push(layer);
    }
  });
  
  return activelayers;
};

_Viewer.prototype.removeLayers = function(){
  this.map.getLayers().clear();
};

_Viewer.prototype.getLayersNoBase = function(){
  var layers = [];
  this.map.getLayers().forEach(function(layer) {
    var props = layer.getProperties();
    if (props.basemap != true){
      layers.push(layer);
    }
  });
  
  return layers;
};

_Viewer.prototype.addBaseLayer = function(type){
  var layer;
  type ? layer = BaseLayers[type]:  layer = BaseLayers.BING.Aerial;
  this.map.addLayer(layer);
};

_Viewer.prototype.changeBaseLayer = function(layerName){
  var baseLayer = this.getLayerByName(layername);
  var layers = this.map.getLayers();
  layers.insertAt(0, baseLayer);
};

module.exports = MapHelpers;
