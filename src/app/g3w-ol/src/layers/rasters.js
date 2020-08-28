const RasterLayers = {};
const DPI = require('../utils/utils').getDPI();

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
      if (data !== undefined) imageTile.getImage().src = window.URL.createObjectURL(data);
      else imageTile.setState(ol.TileState.ERROR);

    };
    xhr.onerror = function() {
      image.setState(ol.TileState.ERROR);
    };
    xhr.send(method=== 'POST' && params);
  };
};

RasterLayers.TiledWMSLayer = function(layerObj,extraParams){
  const options = {
    layerObj: layerObj,
    extraParams: extraParams || {},
    tiled: true
  };
  return RasterLayers._WMSLayer(options);
};

RasterLayers.WMSLayer = function(layerObj,extraParams, method='GET'){
  const options = {
    layerObj: layerObj,
    extraParams: extraParams || {},
    method
  };
  return RasterLayers._WMSLayer(options);
};

RasterLayers.WMTSLayer = function(layerObj, extraParams){
 const optionsFromCapabilities = ol.source.WMTS.optionsFromCapabilities;
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
  const source = new ol.source.TileArcGISRest({
    url: options.url
  });

  return  new ol.layer.Tile({
    extent: options.extent,
    source
  })
};

RasterLayers._WMSLayer = function(options={}) {
  const layerObj = options.layerObj;
  const iframe_internal = layerObj.iframe_internal || false;
  const method = options.method || 'GET';
  const extraParams = options.extraParams;
  const tiled = options.tiled || false;
  const projection = layerObj.projection ? layerObj.projection.getCode() : null;
  let params = {
    LAYERS: layerObj.layers || '',
    VERSION: '1.3.0',
    TRANSPARENT: true,
    SLD_VERSION: '1.1.0',
    DPI
  };
  params = Object.assign({},params,extraParams);
  const sourceOptions = {
    url: layerObj.url,
    params,
    ratio: 1,
    projection
  };

  if (iframe_internal || method === 'POST')
    loadImageTileFunction({
      method,
      type: 'image',
      sourceOptions
    });

  const imageOptions = {
    id: layerObj.id,
    name: layerObj.name,
    opacity: layerObj.opacity || 1.0,
    visible:layerObj.visible,
    extent: layerObj.extent,
    maxResolution: layerObj.maxResolution
  };

  let imageClass;
  let source;
  if (tiled) {
    source = new ol.source.TileWMS(sourceOptions);
    imageClass = ol.layer.Tile;
  } else {
    source = new ol.source.ImageWMS(sourceOptions);
    imageClass = ol.layer.Image;
  }
  imageOptions.source = source;
  const image = new imageClass(imageOptions);
  return image;
};

RasterLayers.XYZLayer = function(options={}, method='GET') {
  const iframe_internal = options.iframe_internal || false;
  const {url, projection, maxZoom, minZoom, extent} = options;
  if (!url) return;
  const sourceOptions = {
    url,
    maxZoom,
    minZoom,
    projection,
  };
  if (iframe_internal)
    loadImageTileFunction({
      method,
      type: 'tile',
      sourceOptions
    });
  const source = new ol.source.XYZ(sourceOptions);
  return new ol.layer.Tile({
    extent: projection.getAxisOrientation() === 'neu' ? [extent[1], extent[3], extent[0], extent[2]]: extent,
    source
  });
};

module.exports = RasterLayers;

