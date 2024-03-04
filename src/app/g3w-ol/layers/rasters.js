import { getDPI } from 'utils/getDPI';

const DPI = getDPI();

const loadImageTileFunction = (method='GET') => {
  return function(tile, url) {
    const xhr = new XMLHttpRequest();
    xhr.open(method, 'POST' === method && url.split('?')[0] || url);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
    xhr.responseType = 'blob';
    xhr.onload = function() {
      if (this.response !== undefined) {
        tile.getImage().src = (window.URL || window.webkitURL).createObjectURL(this.response);
      } else {
        tile.setState(ol.TileState.ERROR);
      }
    };
    xhr.onerror = function() {
      tile.setState(ol.TileState.ERROR);
    };
    xhr.send('POST' === method && url.split('?')[1]);
  };
};

const RasterLayers = {
  
  TiledWMSLayer(layerObj, extraParams) {
    return RasterLayers._WMSLayer({
      layerObj,
      extraParams: extraParams || {},
      tiled: true,
    });
  },

  WMSLayer(layerObj, extraParams = {}, method = 'GET') {
    return RasterLayers._WMSLayer({
      layerObj,
      extraParams,
      method,
    });
  },

  WMTSLayer() {
    return new ol.layer.Tile({
      opacity: 1,
      source: new ol.source.WMTS(),
    })
  },

  /**
   * @param { Object } opts
   * @param { string } opts.url
   * @param { number } options.ratio
   * @param opts.format
   */
  ImageArgisMapServer(opts = {}) {
    return new ol.layer.Image({
      source: new ol.source.ImageArcGISRest({
        ratio: opts.ratio,
        params: {
          FORMAT: opts.format,
        },
        url: opts.url
      })
    })
  },

  /**
   * @param { Object } opts
   * @param { string } opts.url
   * @param { boolean } opts.visible
   * @param opts.extent
   * @param opts.projection
   * @param opts.attributions
   * @param { boolean } opts.crossOrigin 
   */
  TiledArgisMapServer(opts = {}) {
    return new ol.layer.Tile({
      extent:  opts.extent,
      visible: undefined !== opts.visible ? opts.visible : true,
      source: new ol.source.TileArcGISRest({
        url:          opts.url,
        projection:   opts.projection,
        attributions: opts.attributions,
        crossOrigin:  opts.crossOrigin
      }),
    });
  },

  /**
   * @param { Object } opts
   * @param { 'GET' | 'POST' } opts.method
   * @param opts.extraParams
   * @param { boolean } opts.tiled
   * @param { Object } opts.layerObj
   * @param opts.layerObj.layers
   * @param { string } opts.layerObj.version
   * @param { string } opts.layerObj.sld_version
   * @param opts.layerObj.format since 3.7.11
   * @param { string } opts.layerObj.url
   * @param opts.layerObj.projection
   * @param { string } opts.layerObj.id
   * @param { string } opts.layerObj.name
   * @param { number } opts.layerObj.opacity
   * @param { boolean } opts.layerObj.visible
   * @param opts.layerObj.extent
   * @param opts.layerObj.maxResolution
   * @param { boolean } opts.layerObj.tiled
   */
  _WMSLayer(opts = {}) {
    return new (opts.tiled ? ol.layer.Tile : ol.layer.Image)({
      id:            opts.layerObj.id,
      name:          opts.layerObj.name,
      opacity:       undefined !== opts.layerObj.opacity ? opts.layerObj.opacity : 1.0,
      visible:       opts.layerObj.visible,
      extent:        opts.layerObj.extent,
      maxResolution: opts.layerObj.maxResolution,
      source:        new (opts.tiled ? ol.source.TileWMS : ol.source.ImageWMS)({
        url:        opts.layerObj.url,
        ratio:      1,
        projection: (opts.layerObj.projection) ? opts.layerObj.projection.getCode() : null,
        params:     Object.assign({
          DPI,
          TRANSPARENT: true,
          LAYERS:      undefined !== opts.layerObj.layers      ? opts.layerObj.layers      : '',
          VERSION:     undefined !== opts.layerObj.version     ? opts.layerObj.version     : '1.3.0',
          SLD_VERSION: undefined !== opts.layerObj.sld_version ? opts.layerObj.sld_version : '1.1.0',
          FORMAT:      undefined !== opts.layerObj.format      ? opts.layerObj.format      : undefined,
        }, opts.extraParams),
        imageLoadFunction: opts.layerObj.layers.iframe_internal || 'POST' === opts.method ? loadImageTileFunction(opts.method) : undefined,
      }),
    });

  },

  /**
   * @param { Object } opts
   * @param { string } opts.url
   * @param opts.projection
   * @param { number } opts.maxZoom
   * @param { number } opts.minZoom
   * @param { boolean } opts.visible
   * @param { boolean } opts.crossOrigin
   * @param { boolean } opts.iframe_internal
   * @param { string } opts.cache_provider since 3.10.0 (eg. mapproxy)
   * @param { 'GET' | 'POST' } method 
   */
  XYZLayer(opts = {}, method = 'GET') {
    // skip invalid URLs
    if (!opts.url) {
      return;
    }
    return new ol.layer.Tile({
      visible: undefined !== opts.visible ? opts.visible : true,
      projection: opts.projection,
      source: new ol.source.XYZ({
        url:              opts.url,
        maxZoom:          opts.maxZoom,
        minZoom:          opts.minZoom,
        projection:       opts.projection,
        crossOrigin:      opts.crossOrigin,
        tileLoadFunction: opts.iframe_internal ? loadImageTileFunction(method) : undefined,
        tileGrid:         (
          'degrees' === opts.projection.getUnits() || 'mapproxy' === opts.cache_provider
            ? new ol.tilegrid.TileGrid({
              // Remove the first resolution because in this version of ol createXYZ doesn't accept maxResolution options.
              // The extent of EPSG:4326 is not squared [-180, -90, 180, 90] as EPSG:3857 so the resolution is calculated
              // by Math.max(width(extent)/tileSize,Height(extent)/tileSize)
              // we need to calculate to Math.min instead, so we have to remove the first resolution
              resolutions: ol.tilegrid.createXYZ({ extent: opts.projection.getExtent(), maxZoom: opts.maxZoom}).getResolutions().splice(1),
              extent: opts.projection.getExtent(),
            })
            : undefined
          ),
      }),
    });
  },

};

module.exports = RasterLayers;