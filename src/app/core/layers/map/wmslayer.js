import ApplicationState from 'store/application-state';

const { base, inherit } = require('utils');
const MapLayer          = require('core/layers/map/maplayer');
const RasterLayers      = require('g3w-ol/layers/rasters');

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

/**
 * @param {boolean} withLayers
 * 
 * @returns {RasterLayers.WMSLayer}
 * 
 * @listens ol.source.ImageWMS~imageloadstart
 * @listens ol.source.ImageWMS~imageloadend
 * @listens ol.source.ImageWMS~imageloaderror
 */
proto._makeOlLayer = function(withLayers) {
  const olLayer = new RasterLayers.WMSLayer(
    // wmsConfig
    {
      url:             (this.layers[0] && this.layers[0].getWmsUrl) ? this.layers[0].getWmsUrl() : this.config.url,
      id:              this.config.id,
      projection:      this.config.projection,
      iframe_internal: this.iframe_internal,
      layers:          (withLayers) ? this.layers.map(layer => layer.getWMSLayerName()) : this.layers,
      /** @since 3.9.1 */
      format: this.config.format,
    },
    this.extraParams,
    this._method
  );
  olLayer.getSource().on('imageloadstart', () => this.emit("loadstart"));
  olLayer.getSource().on('imageloadend',   () => this.emit("loadend"));
  olLayer.getSource().on('imageloaderror', () => this.emit("loaderror"));
  return olLayer
};

//update Layers
proto._updateLayers = function(mapState={}, extraParams={}) {
  let {force=false, ...params} = extraParams;
  //check disabled layers
  !force && this.checkLayersDisabled(mapState.resolution, mapState.mapUnits);
  const visibleLayers = this._getVisibleLayers(mapState) || [];
  const {get_LEGEND_ON_LEGEND_OFF_Params} = require('utils/geo');
  if (visibleLayers.length > 0) {
    const CATEGORIES_LAYERS = {};
    const STYLES = [];
    const OPACITIES = [];
    visibleLayers.map(layer => {
      const layerId = layer.getWMSLayerName();
      CATEGORIES_LAYERS[layerId] = { ...get_LEGEND_ON_LEGEND_OFF_Params(layer) };
      STYLES.push(layer.getStyle());
      OPACITIES.push(parseInt((layer.getOpacity()/100) * 255))
    });

    let LEGEND_ON;
    let LEGEND_OFF;
    Object.keys(CATEGORIES_LAYERS).forEach(layerId => {
      if (CATEGORIES_LAYERS[layerId].LEGEND_OFF) {
        if (typeof LEGEND_OFF === 'undefined') LEGEND_OFF = CATEGORIES_LAYERS[layerId].LEGEND_OFF;
        else LEGEND_OFF = `${LEGEND_OFF};${CATEGORIES_LAYERS[layerId].LEGEND_OFF}`;
      }
      if (CATEGORIES_LAYERS[layerId].LEGEND_ON) {
        if (typeof LEGEND_ON === 'undefined') LEGEND_ON = CATEGORIES_LAYERS[layerId].LEGEND_ON;
        else LEGEND_ON = `${LEGEND_ON};${CATEGORIES_LAYERS[layerId].LEGEND_ON}`;
      }
    });
    const prefix = visibleLayers[0].isArcgisMapserver() ? 'show:' : '';
     params = {
      ...params,
      filtertoken: ApplicationState.tokens.filtertoken,
      STYLES: STYLES.join(','),
      /** @since v3.8 */
      OPACITIES: OPACITIES.join(','),
      LEGEND_ON,
      LEGEND_OFF,
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
