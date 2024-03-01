import { getDPI } from 'utils/getDPI';

const DPI = getDPI();

const RasterLayers = {};

/**
 * @since 3.10.0
 * @param projection
 * @param cache_provider
 * @param maxZoom
 * @private
 */
function createTileGrid({projection, cache_provider, maxZoom}) {
  if ('degrees' === projection.getUnits() || 'mapproxy' === cache_provider) { /** @since 3.10.0 add cache_provider **/
  const extent = projection.getExtent();
    const resolutions = ol.tilegrid.createXYZ({extent, maxZoom}).getResolutions();
    // Need to remove the first resolution because in this version of ol createXYZ doesn't accept maxResolution options.
    // The extent of EPSG:4326 is not squared [-180, -90, 180, 90] as EPSG:3857 so the resolution is calculated
    // by Math.max(width(extent)/tileSize,Height(extent)/tileSize)
    // we need to calculate to Math.min instead, so we have to remove the first resolution
    resolutions.splice(0,1);
    //////////////////////////////////////////
    return new ol.tilegrid.TileGrid({ extent, resolutions});
  }
}

const loadImageTileFunction = function({method='GET', type='image', sourceOptions={}}) {
  window.URL = window.URL || window.webkitURL;
  sourceOptions[`${type}LoadFunction`] = function(imageTile, url) {
    const xhr = new XMLHttpRequest();
    const [_url, params] = url.split('?');
    xhr.open(method, method === 'POST' && _url || url);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
    xhr.responseType = 'blob';
    xhr.onload = function() {
      const data = this.response;
      if (data !== undefined) {
        imageTile.getImage().src = window.URL.createObjectURL(data);
      } else {
        imageTile.setState(ol.TileState.ERROR);
      }
    };
    xhr.onerror = function() {
      image.setState(ol.TileState.ERROR);
    };
    xhr.send(method === 'POST' && params);
  };
};

RasterLayers.TiledWMSLayer = function(layerObj, extraParams){
  return RasterLayers._WMSLayer({
    layerObj,
    extraParams: extraParams || {},
    tiled: true
  });
};

RasterLayers.WMSLayer = function(layerObj, extraParams={}, method='GET'){
  return RasterLayers._WMSLayer({
    layerObj,
    extraParams,
    method,
  });
};

RasterLayers.WMTSLayer = function(layerObj, extraParams){
  return new ol.layer.Tile({
    opacity: 1,
    source: new ol.source.WMTS(options)
  })
};

RasterLayers.ImageArgisMapServer = function(options={}){
  return  new ol.layer.Image({
    source: new ol.source.ImageArcGISRest({
      ratio: options.ratio,
      params: {
        FORMAT: options.format
      },
      url: options.url
    })
  })
};

RasterLayers.TiledArgisMapServer = function(options={}){
  const {url, visible=true, extent, projection, attributions, crossOrigin} = options;
  const source = new ol.source.TileArcGISRest({
    url,
    projection,
    attributions,
    crossOrigin
  });
  return  new ol.layer.Tile({
    extent,
    visible,
    source
  })
};

RasterLayers._WMSLayer = function(options={}) {

  const {
    layerObj,
    method='GET',
    extraParams,
    tiled=false
  } = options;

  const {
    iframe_internal=false,
    layers='',
    version='1.3.0',
    sld_version='1.1.0',
    id,
    name,
    opacity=1.0,
    visible,
    extent,
    maxResolution,
    /**
     * @since @3.7.11
     */
    format
  } = layerObj;

  let params = {
    LAYERS: layers,
    VERSION: version,
    TRANSPARENT: true,
    SLD_VERSION: sld_version,
    DPI
  };

  /**
   * Check if not undefined otherwise FORMAT parameter is not send
   * 
   * @since 3.7.11
   */
  if (undefined !== format) {
    params.FORMAT = format
  }

  const sourceOptions = {
    url: layerObj.url,
    params: Object.assign({}, params, extraParams),
    ratio: 1,
    projection: (layerObj.projection) ? layerObj.projection.getCode() : null
  };

  if (iframe_internal || 'POST' === method) {
    loadImageTileFunction({ method, sourceOptions, type: 'image' });
  }

  const imageOptions = {
    id,
    name,
    opacity,
    visible,
    extent,
    maxResolution,
  };

  if (tiled) {
    imageOptions.source = new ol.source.TileWMS(sourceOptions);
    return new ol.layer.Tile(imageOptions);
  }

  imageOptions.source = new ol.source.ImageWMS(sourceOptions);
  return new ol.layer.Image(imageOptions);

};

RasterLayers.XYZLayer = function(options={}, method='GET') {
  const iframe_internal = options.iframe_internal || false;
  const {
    url,
    projection,
    maxZoom,
    minZoom,
    visible=true,
    crossOrigin,
    cache_provider, /** @since 3.10.0 **/
  } = options;
  //in case of no url provide, skip
  if (!url) {
    return;
  }
  const sourceOptions = {
    url,
    maxZoom,
    minZoom,
    projection,
    crossOrigin,
    tileGrid: createTileGrid({ projection, cache_provider, maxZoom }),
  };

  if (iframe_internal) {
    loadImageTileFunction({
      method,
      type: 'tile',
      sourceOptions
    });
  }

  const source = new ol.source.XYZ(sourceOptions);
  return new ol.layer.Tile({
    visible,
    projection,
    source
  });
};



module.exports = RasterLayers;

