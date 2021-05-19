const {base, inherit} = require('core/utils/utils');
const G3WObject = require('core/g3wobject');

function MapLayer(config={}) {
  this.config = config;
  this.id = config.id;
  this.iframe_internal = config.iframe_internal || false;
  this.extent = config.extent;
  this.projection = config.projection;
  this.layer = null;
  this.layers = []; // store all enabled layers
  this.allLayers = []; // store all layers
  base(this);
}

inherit(MapLayer, G3WObject);

const proto = MapLayer.prototype;

proto.getId = function(){
  return this.id;
};

proto.getOLLayer = function(withLayers) {
  this._olLayer = !this._olLayer ? this._makeOlLayer(withLayers) : this._olLayer;
  return this._olLayer;
};

proto.getQueryUrl = function() {
  const layer = this.layers[0];
  return (layer.infourl && layer.infourl !== '') ? layer.infourl : this.config.url;
};

proto.getLayerConfigs = function(){
  return this.layers;
};

/**
 * Get source ol
 * @returns {*}
 */
proto.getSource = function() {
  return this.getOLLayer().getSource();
};

/**
 *
 * @returns {string}
 */
proto.getInfoFormat = function() {
  return 'application/vnd.ogc.gml';
};

/**
 * Called when toggled layer is set on TOC
 * @param layer
 */
proto.toggleLayer = function(layer) {
  this.layers.forEach(_layer => {
    if (_layer.id === layer.id){
      _layer.visible = layer.visible;
    }
  });
  this._updateLayers();
};

/**
 * Remove layer from layers
 * @param layer
 */
proto.removeLayer = function(layer) {
  this.layers = this.layers.filter(_layer => layer !== _layer)
};

/**
 *
 */
proto.update = function(){
  //To overwrite
};

/**
 * Check if is visible
 * @returns {boolean}
 */
proto.isVisible = function(){
  return this._getVisibleLayers().length > 0;
};

/**
 *
 * @returns {T[]}
 */
proto.getQueryableLayers = function() {
  return this.layers.filter(layer => layer.isQueryable());
};

/**
 * Visible layers
 * @private
 */
proto._getVisibleLayers = function(){
  return this.layers.filter(layer => layer.isVisible());
};

/**
 * Create GetFeatureInfo url
 * @param coordinate
 * @param resolution
 * @param epsg
 * @param params
 */
proto.getGetFeatureInfoUrl = function(coordinate,resolution,epsg,params) {
  return this.getOLLayer().getSource().getGetFeatureInfoUrl(coordinate,resolution,epsg,params);
};

/**
 * Method generic to get order if set to layer
 * @param prefix
 * @param layers
 */
proto.getOrderVisibleListLayers = function({prefix, layers=[]}){
  return `${prefix}${visibleLayers.map(layer => {
    return layer.getWMSLayerName();
  }).join(',')}`
};

/**
 * Add Layer method used to add layer
 * @param layer
 */
proto.addLayer = function(layer) {
  !this.allLayers.find(_layer =>  layer === _layer) && this.allLayers.push(layer);
  !this.layers.find(_layer => layer === _layer) && this.layers.push(layer);
};

/**
 * Method to upadet ma layer when something is changed on map
 */
proto._updateLayers = function(mapState={}, extraParams={}){
  // to owerwrite for each specific layer
};

proto.checkLayerDisabled = function(layer, resolution, mapUnits) {
  layer.setDisabled(resolution, mapUnits);
  return layer.isDisabled();
};

// check which layers has to be disabled
proto.checkLayersDisabled = function(resolution, mapUnits) {
  this.allLayers.forEach(layer => this.checkLayerDisabled(layer, resolution, mapUnits));
};

proto.setupCustomMapParamsToLegendUrl = function(params={}){
  //to owerwrite for each map layer subclass
};

module.exports = MapLayer;
