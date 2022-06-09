import ApplicationState from 'core/applicationstate';
import WMSLayer from './wmslayer';
import RasterLayers from '/g3w-ol/src/layers/rasters';

class WMSTLayer extends WMSLayer {
  constructor(options={}, extraParams={}, method='GET') {
    super(options);
    this.LAYERTYPE = {
      LAYER: 'layer',
      MULTILAYER: 'multilayer'
    };
    this.extraParams = extraParams;
    this._method = method;
  }

  _makeOlLayer(withLayers) {
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
    const olLayer = new RasterLayers.TiledWMSLayer(wmsConfig, this.extraParams, this._method);
    olLayer.getSource().on('tileloadstart', () => this.emit("loadstart"));
    olLayer.getSource().on('tileloadend', () => this.emit("loadend"));
    olLayer.getSource().on('tileloaderror', ()=> this.emit("loaderror"));
    return olLayer
  };
}

export default  WMSTLayer;
