const MapLayer = require('core/layers/map/maplayer');

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

    const url        = this.config.url;
    const projection = url && this.projection ? this.projection : this.layer.getProjection();

    /** @FIXME invalid return type */
    if (!url) {
      return;
    }

    this._olLayer = new ol.layer.Tile({
      visible:    true,
      projection,
      source:     new ol.source.XYZ({
        url,
        maxZoom:          20,
        minZoom:          undefined,
        projection,
        crossOrigin:      undefined,
        tileLoadFunction: (this.iframe_internal) ? (tile, url) => {
          fetch('POST' === method ? (url || '').split('?')[0] : url, {
            method,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
            body:    'POST' === method ? url.split('?')[1] : undefined,
          })
          .then(async response => tile.getImage().src = window.URL.createObjectURL(await response.blob()))
          .catch(e => { console.error('Invalid tile', ol.TileState.ERROR, e); tile.setState(ol.TileState.ERROR); });
        } : undefined,
        /** @since 3.10.0 - Map Proxy cache_provider **/
        tileGrid: ('degrees' === projection.getUnits() || 'mapproxy' === this.config.cache_provider) ? new ol.tilegrid.TileGrid({
          // Need to remove the first resolution because in this version of ol createXYZ doesn't accept maxResolution options.
          // The extent of EPSG:4326 is not squared [-180, -90, 180, 90] as EPSG:3857 so the resolution is calculated
          // by Math.max(width(extent)/tileSize,Height(extent)/tileSize)
          // we need to calculate to Math.min instead, so we have to remove the first resolution
          resolutions: ol.tilegrid.createXYZ({ extent: projection.getExtent(), maxZoom: 20 }).getResolutions().slice(1),
          extent:      projection.getExtent(),
        }) : undefined,
      })
    });

    this._olLayer.getSource().on('imageloadstart', () => this.emit('loadstart'));
    this._olLayer.getSource().on('imageloadend',   () => this.emit('loadend'));
    this._olLayer.getSource().on('imageloaderror', () => this.emit('loaderror'));

    return this._olLayer;
  }

  _updateLayer(mapState = {}, extraParams = {}) {
    if (!extraParams.force) {
      this.checkLayersDisabled(mapState.resolution, mapState.mapUnits)
    }

    this._olLayer.setVisible(this.layer.isVisible());
  }

};