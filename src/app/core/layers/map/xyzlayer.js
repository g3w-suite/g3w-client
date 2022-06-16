import RasterLayers from 'g3w-ol/src/layers/rasters';
import MapLayer from './maplayer';

class XYZLayer extends MapLayer {
  constructor(options = {}, method = 'GET') {
    super(options);
    this._method = method;
  }

  getOLLayer() {
    let olLayer = this._olLayer;
    if (!olLayer) olLayer = this._olLayer = this._makeOlLayer();
    return olLayer;
  }

  getSource() {
    return this.getOLLayer().getSource();
  }

  getLayerConfigs() {
    return this.layer;
  }

  addLayer(layer) {
    this.layer = layer;
    this.layers.push(layer);
    this.allLayers.push(layer);
  }

  update(mapState, extraParams) {
    this._updateLayer(mapState, extraParams);
  }

  isVisible() {
    return layer.state.visible;
  }

  _makeOlLayer() {
    const projection = this.projection ? this.projection : this.layer.getProjection();
    const layerOptions = {
      url: `${this.layer.getCacheUrl()}/{z}/{x}/{y}.png`,
      maxZoom: 20,
      extent: this.config.extent,
      iframe_internal: this.iframe_internal,
    };

    layerOptions.projection = projection;
    this._olLayer = new RasterLayers.XYZLayer(layerOptions, this._method);

    this._olLayer.getSource().on('imageloadstart', () => {
      this.fire('loadstart');
    });
    this._olLayer.getSource().on('imageloadend', () => {
      this.fire('loadend');
    });
    this._olLayer.getSource().on('imageloaderror', () => {
      this.fire('loaderror');
    });
    return this._olLayer;
  }

  _updateLayer(mapState = {}, extraParams = {}) {
    const { force = false } = extraParams;
    !force && this.checkLayersDisabled(mapState.resolution, mapState.mapUnits);
    this._olLayer.setVisible(this.layer.isVisible());
  }
}

export default XYZLayer;
