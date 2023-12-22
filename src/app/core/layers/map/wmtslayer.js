const { inherit, base } = require('utils');
const MapLayer          = require('core/layers/map/maplayer');
const RasterLayers      = require('g3w-ol/layers/rasters');

function WMSTLayer(options={}, extraParams={}, method='GET') {
  this.LAYERTYPE = {
    LAYER: 'layer',
    MULTILAYER: 'multilayer'
  };
  this.extraParams = extraParams;
  this._method = method;
  base(this,options);
}

inherit(WMSTLayer, MapLayer);

const proto = WMSTLayer.prototype;

proto.getOLLayer = function(withLayers) {
  if (!this._olLayer) {
    this._olLayer = this._makeOlLayer(withLayers);
  }
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
  if (!this.allLayers.find(_layer => layer === _layer)) {
    this.allLayers.push(layer);
  }
  if (!this.layers.find(_layer => layer === _layer)) {
    this.layers.push(layer);
  }
};

proto.removeLayer = function(layer) {
  this.layers = this.layers.filter(_layer => layer !== _layer);
};

proto.update = function(mapState={}, extraParams={}) {
  this._updateLayers(mapState, extraParams);
};

proto.isVisible = function(){
  return this._getVisibleLayers().length > 0;
};

proto.getQueryUrl = function() {
  const layer = this.layers[0];
  if (layer.infourl && layer.infourl !== '') {
    return layer.infourl;
  }
  return this.config.url;
};

proto.getQueryableLayers = function() {
  return this.layers.filter(layer => layer.isQueryable());
};

proto._getVisibleLayers = function() {
  return this.layers.filter(layer => layer.isVisible());
};

proto._makeOlLayer = function() {
  const olLayer = new RasterLayers.WMSTLayer({
    url:        this.config.url,
    id:         this.config.id,
    projection: this.config.projection
  }, this.extraParams, this._method);

  olLayer.getSource().on('tileloadstart', () => this.emit('loadstart'));
  olLayer.getSource().on('tileloadend',   () => this.emit('loadend'));
  olLayer.getSource().on('tileloaderror', () => this.emit('loaderror'));

  return olLayer
};

proto.checkLayerDisabled = function(layer, resolution, mapUnits) {
  layer.setDisabled(resolution, mapUnits);
  return layer.isDisabled();
};

// check which layers has to be disabled
proto.checkLayersDisabled = function(resolution, mapUnits) {
  this.allLayers.forEach(layer => {
    this.checkLayerDisabled(layer, resolution, mapUnits);
  });
};

//update Layers
proto._updateLayers = function(mapState = {}, extraParams = {}) {
  let {
    force=false,
    ...params
  } = extraParams;

  //check disabled layers
  if (!force) {
    this.checkLayersDisabled(mapState.resolution, mapState.mapUnits);
  } 

  const layers = this._getVisibleLayers(mapState) || [];

  // skip when ..
  if (layers.length <= 0) {
    this._olLayer.setVisible(false);
    return;
  }

  this._olLayer.setVisible(true);
  this._olLayer.getSource().updateParams({
    ...params,
    LAYERS: `${layers[0].isArcgisMapserver() ? 'show:' : ''}${layers.map(l => l.getWMSLayerName()).join(',')}`
  });
};

module.exports = WMSTLayer;
