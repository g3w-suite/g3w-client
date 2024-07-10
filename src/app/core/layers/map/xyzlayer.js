const MapLayer     = require('core/layers/map/maplayer');
const RasterLayers = require('g3w-ol/layers/rasters');

module.exports = class XYZLayer extends MapLayer {

  constructor(options, method="GET") {
    super(options);
    this._method = method;
  }

  getOLLayer() {
    if (!this._olLayer) {
      this._olLayer = this._makeOlLayer();
    }
    return this._olLayer;
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
    this._olLayer = new RasterLayers.XYZLayer({
      url:             this.config.url,
      maxZoom:         20,
      extent:          this.config.extent,
      iframe_internal: this.iframe_internal,
      projection:      this.projection ? this.projection : this.layer.getProjection(),
      cache_provider:  this.config.cache_provider,
    }, this._method);

    this._olLayer.getSource().on('imageloadstart', () => this.emit('loadstart'));
    this._olLayer.getSource().on('imageloadend',   () => this.emit('loadend'));
    this._olLayer.getSource().on('imageloaderror', () => this.emit('loaderror'));

    return this._olLayer
  }

  _updateLayer(mapState = {}, extraParams = {}) {
    if (!extraParams.force) {
      this.checkLayersDisabled(mapState.resolution, mapState.mapUnits)
    }

    this._olLayer.setVisible(this.layer.isVisible());
  }

};