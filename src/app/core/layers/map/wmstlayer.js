const WMSLayer     = require('core/layers/map/wmslayer');
const RasterLayers = require('g3w-ol/layers/rasters');

module.exports = class WMSTLayer extends WMSLayer {

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
    const layerObj = {
      url:               ('mapproxy' === this.config.cache_provider) || !(this.layers[0] && this.layers[0].getWmsUrl) ? this.config.url : this.layers[0].getWmsUrl(),
      id:                this.config.id,
      projection:        this.config.projection,
      iframe_internal:   this.iframe_internal,
      layers:            (withLayers) ? this.layers.map(l => l.getWMSLayerName()) : this.layers,
      cache_provider:    this.config.cache_provider, /** @since 3.10.0 **/
      cache_type:        this.config.cache_type, /** @since 3.10.0  tms, wms**/
      cache_layer:       this.config.cache_layer,
      cache_extent:      this.config.cache_extent,
      cache_grid:        this.config.cache_grid,
      cache_grid_extent: this.config.cache_grid_extent,
    };

    /** @since 3.10.0 - MapProxy WMTS layer **/
    const resolutions = 'mapproxy' === layerObj.cache_provider && ol.tilegrid.createXYZ({ extent: opts.cache_grid_extent }).getResolutions();

    const olLayer = resolutions
      ? new ol.layer.Tile({
        source: new ol.source.WMTS({
          url:         layerObj.url,
          layer:       layerObj.cache_layer,
          matrixSet:   layerObj.cache_grid,
          format:      layerObj.cache_format || 'png',
          projection:  layerObj.layers[0].getProjection(),
          tileGrid: new ol.tilegrid.WMTS({
            resolutions,
            origin:    ol.extent.getTopLeft(layerObj.cache_grid_extent),
            matrixIds: resolutions.map((_, i) => i),
          }),
          style:       layerObj.style || '',
          transparent: false,
        })
      })
      : RasterLayers.WMSLayer({
        layerObj,
        extraParams: this.extraParams || {},
        tiled: true
      });

    olLayer.getSource().on('tileloadstart', () => this.emit('loadstart'));
    olLayer.getSource().on('tileloadend',   () => this.emit('loadend'));
    olLayer.getSource().on('tileloaderror', () => this.emit('loaderror'));

    return olLayer
  }

};