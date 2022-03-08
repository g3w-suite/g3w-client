import ApplicationState from 'core/applicationstate';
const {base, inherit} = require('core/utils/utils');
const MapLayer = require('./maplayer');
const RasterLayers = require('g3w-ol/src/layers/rasters');

function WMSLayer(options={}, extraParams={}, method='GET') {
  this.LAYERTYPE = {
    LAYER: 'layer',
    MULTILAYER: 'multilayer'
  };
  this.extraParams = extraParams;
  this._method = method;
  base(this, options);
}

inherit(WMSLayer, MapLayer);

const proto = WMSLayer.prototype;

proto.getOLLayer = function(withLayers) {
  if (!this._olLayer) this._olLayer = this._makeOlLayer(withLayers);
  return this._olLayer;
};

proto.getSource = function() {
  return this.getOLLayer().getSource();
};

proto.getInfoFormat = function() {
  return 'application/vnd.ogc.gml';
};

proto.getGetFeatureInfoUrl = function(coordinate,resolution,epsg,params) {
  return this.getOLLayer().getSource().getGetFeatureInfoUrl(coordinate,resolution,epsg,params);
};

proto.getLayerConfigs = function(){
  return this.layers;
};

proto.addLayer = function(layer) {
  if (!this.allLayers.find(_layer => layer === _layer)) this.allLayers.push(layer);
  if (!this.layers.find(_layer =>  layer === _layer)) this.layers.push(layer);
};

proto.removeLayer = function(layer) {
  this.layers = this.layers.filter((_layer) => {
    return layer !== _layer;
  })
};

proto.isVisible = function(){
  return this._getVisibleLayers().length > 0;
};

proto.getQueryUrl = function() {
  const layer = this.layers[0];
  if (layer.infourl && layer.infourl !== '') return layer.infourl;
  return this.config.url;
};

proto.getQueryableLayers = function() {
  return this.layers.filter(layer => layer.isQueryable());
};

proto._getVisibleLayers = function() {
  return this.layers.filter(layer => layer.isVisible());
};

proto._makeOlLayer = function(withLayers) {
  const wmsConfig = {
    url: this.config.url,
    id: this.config.id,
    projection: this.config.projection,
    iframe_internal: this.iframe_internal,
    layers: this.layers
  };
  if (withLayers) wmsConfig.layers = this.layers.map(layer => layer.getWMSLayerName());
  const representativeLayer = this.layers[0];
  if (representativeLayer && representativeLayer.getWmsUrl) wmsConfig.url = representativeLayer.getWmsUrl();
  const olLayer = new RasterLayers.WMSLayer(wmsConfig, this.extraParams, this._method);
  olLayer.getSource().on('imageloadstart', () => this.emit("loadstart"));
  olLayer.getSource().on('imageloadend', () => this.emit("loadend"));
  olLayer.getSource().on('imageloaderror', ()=> this.emit("loaderror"));
  return olLayer
};

//update Layers
proto._updateLayers = function(mapState={}, extraParams={}) {
  let {force=false, ...params} = extraParams;
  //check disabled layers
  !force && this.checkLayersDisabled(mapState.resolution, mapState.mapUnits);
  const visibleLayers = this._getVisibleLayers(mapState) || [];
  if (visibleLayers.length > 0) {
    const STYLES = visibleLayers.map(layer => layer.getStyle()).join(',');
    const prefix = visibleLayers[0].isArcgisMapserver() ? 'show:' : '';
     params = {
      ...params,
      filtertoken: ApplicationState.tokens.filtertoken,
      STYLES,
      LAYERS: `${prefix}${visibleLayers.map((layer) => {
        return layer.getWMSLayerName();
      }).join(',')}`
    };
    this._olLayer.setVisible(true);
    this._olLayer.getSource().updateParams(params);
  } else this._olLayer.setVisible(false);
};

proto.setupCustomMapParamsToLegendUrl = function(params={}){
  if (this.layer) this.layer.setMapParamstoLegendUrl(params);
  else this.layers.forEach(layer => layer.setMapParamstoLegendUrl(params));
};

module.exports = WMSLayer;
