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
  if (!this.allLayers.find(l => l === layer)) this.allLayers.push(layer);
  if (!this.layers.find(l => l === layer))    this.layers.push(layer);
};

proto.removeLayer = function(layer) {
  this.layers = this.layers.filter(l => l !== layer);
};

proto.isVisible = function(){
  return this._getVisibleLayers().length > 0;
};

proto.getQueryUrl = function() {
  if (this.layers[0].infourl && '' !== this.layers[0].infourl) {
    return this.layers[0].infourl;
  }
  return this.config.url;
};

proto.getQueryableLayers = function() {
  return this.layers.filter(l => l.isQueryable());
};

proto._getVisibleLayers = function() {
  return this.layers.filter(l => l.isVisible());
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
    {
      url:             (this.layers[0] && this.layers[0].getWmsUrl) ? this.layers[0].getWmsUrl() : this.config.url,
      id:              this.config.id,
      projection:      this.config.projection,
      iframe_internal: this.iframe_internal,
      layers:          (withLayers) ? this.layers.map(layer => layer.getWMSLayerName()) : this.layers,
      /** @since 3.9.1 */
      format:          this.config.format,
    },
    this.extraParams,
    this._method
  );

  olLayer.getSource().on('imageloadstart', () => this.emit('loadstart'));
  olLayer.getSource().on('imageloadend',   () => this.emit('loadend'));
  olLayer.getSource().on('imageloaderror', () => this.emit('loaderror'));

  return olLayer
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
  const { get_LEGEND_ON_LEGEND_OFF_Params } = require('utils/geo');

  // skip when ..
  if (layers.length <= 0) {
    this._olLayer.setVisible(false);
    return;
  }

  const CATEGORIES_LAYERS = {};
  const STYLES            = [];
  const OPACITIES         = [];

  layers.map(layer => {
    CATEGORIES_LAYERS[layer.getWMSLayerName()] = { ...get_LEGEND_ON_LEGEND_OFF_Params(layer) };
    STYLES.push(layer.getStyle());
    OPACITIES.push(parseInt((layer.getOpacity()/100) * 255))
  });

  let LEGEND_ON;
  let LEGEND_OFF;

  Object
    .keys(CATEGORIES_LAYERS)
    .forEach(layerId => {
      const on  = CATEGORIES_LAYERS[layerId].LEGEND_ON;
      const off = CATEGORIES_LAYERS[layerId].LEGEND_OFF;
      if (on)  LEGEND_ON  = undefined === LEGEND_ON  ? on  : `${LEGEND_ON};${on}`;
      if (off) LEGEND_OFF = undefined === LEGEND_OFF ? off : `${LEGEND_OFF};${off}`;
    });

  this._olLayer.setVisible(true);
  this._olLayer.getSource().updateParams({
    ...params,
    filtertoken: ApplicationState.tokens.filtertoken,
    STYLES: STYLES.join(','),
    /** @since 3.8 */
    OPACITIES: OPACITIES.join(','),
    LEGEND_ON,
    LEGEND_OFF,
    LAYERS: `${layers[0].isArcgisMapserver() ? 'show:' : ''}${layers.map((layer) => {
      return layer.getWMSLayerName();
    }).join(',')}`
  });

};

proto.setupCustomMapParamsToLegendUrl = function(params = {}){
  [].concat(this.layer || this.layers).forEach(l => l.setMapParamstoLegendUrl(params));
};

module.exports = WMSLayer;