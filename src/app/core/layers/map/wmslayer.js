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
  this.set_style = false;
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
  if (!this.allLayers.find(_layer => layer === _layer)) {
    this.allLayers.push(layer);
  }
  if (!this.layers.find(_layer =>  layer === _layer)) {
    this.layers.push(layer);
  }
  //check if i have to set set style
  const styles = layer.state.styles;
  if (!this.set_styles && (styles && Array.isArray(styles) && styles.length > 1)){
    this.set_style = true;
  }
};

proto.removeLayer = function(layer) {
  this.layers = this.layers.filter((_layer) => {
    return layer !== _layer;
  })
};

proto.toggleLayer = function(layer) {
  this.layers.forEach((_layer) => {
    if (_layer.id === layer.id){
      _layer.visible = layer.visible;
    }
  });
  this._updateLayers();
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
  return this.layers.filter((layer) => {
    return layer.isQueryable();
  });
};

proto._getVisibleLayers = function() {
  return this.layers.filter((layer) => {
    return layer.isVisible();
  });
};

proto._makeOlLayer = function(withLayers) {
  const wmsConfig = {
    url: this.config.url,
    id: this.config.id,
    projection: this.config.projection,
    iframe_internal: this.iframe_internal
  };
  if (withLayers) wmsConfig.layers = this.layers.map(layer => layer.getWMSLayerName());
  const representativeLayer = this.layers[0];
  if (representativeLayer) wmsConfig.url = representativeLayer.getWmsUrl();
  const olLayer = new RasterLayers.WMSLayer(wmsConfig, this.extraParams, this._method);

  olLayer.getSource().on('imageloadstart', () => {
    this.emit("loadstart");
  });
  olLayer.getSource().on('imageloadend', () => {
    this.emit("loadend");
  });

  olLayer.getSource().on('imageloaderror', ()=> {
    this.emit("loaderror");
  });
  return olLayer
};

//update Layers
proto._updateLayers = function(mapState={}, extraParams={}) {
  //check disabled layers
  this.checkLayersDisabled(mapState.resolution, mapState.mapUnits);
  const visibleLayers = this._getVisibleLayers(mapState) || [];
  if (visibleLayers.length > 0) {
    const prefix = visibleLayers[0].isArcgisMapserver() ? 'show:' : '';
    let params = {
      filtertoken: ApplicationState.tokens.filtertoken,
      STYLES: this.set_style ? visibleLayers.map(layer => layer.state.styles ? layer.state.styles.find(style => style.current).name : '').join(','): undefined,
      LAYERS: `${prefix}${visibleLayers.map((layer) => {
        return layer.getWMSLayerName();
      }).join(',')}`
    };
    if (extraParams) params = _.assign(params, extraParams);
    this._olLayer.setVisible(true);
    this._olLayer.getSource().updateParams(params);
  } else this._olLayer.setVisible(false);
};

proto.setupCustomMapParamsToLegendUrl = function(params={}){
  if (this.layer) this.layer.setMapParamstoLegendUrl(params);
  else this.layers.forEach(layer => {
    layer.setMapParamstoLegendUrl(params)
  });

};

module.exports = WMSLayer;
