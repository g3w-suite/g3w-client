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

/**
 *
 * @param withLayers
 * @returns {*}
 * @private
 */
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

/**
 * Handle to update layer
 * @param mapState
 * @param extraParams
 */
proto.update = function(mapState={}, extraParams={}) {
  this._updateLayers(mapState, extraParams);
};

/**
 *
 * @param mapState
 * @param extraParams
 * @private
 */
proto._updateLayers = function(mapState={}, extraParams={}) {
  //check disabled layers
  const {mapUnits, resolution} = mapState;
  this.checkLayersDisabled(resolution, mapUnits);
  const visibleLayers = this._getVisibleLayers(mapState) || [];
  if (visibleLayers.length > 0) {
    const STYLES = visibleLayers.map(layer => layer.getStyle()).join(',');
    const prefix = visibleLayers[0].isArcgisMapserver() ? 'show:' : '';
    let params = {
      filtertoken: ApplicationState.tokens.filtertoken,
      STYLES,
      LAYERS: `${prefix}${visibleLayers.map(layer => {
        return layer.getWMSLayerName();
      }).join(',')}`,
      ...extraParams
    };
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
