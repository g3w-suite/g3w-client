const RasterLayers = require('./rasters');
const BaseLayers = {};

BaseLayers.OSM = {};

BaseLayers.OSM.get = function({title, id, url}={}){
  return new ol.layer.Tile({
    source: new ol.source.OSM({
      url
    }),
    id: id || 'osm',
    title: title || 'OSM',
    basemap: true
  });
};

BaseLayers.TMS =  {
  get({visible=false, url=null, source_type="xyz", minZoom, maxZoom, projection, attributions, crossOrigin='anonymous'}={}) {
    let layer;
    switch(source_type) {
      case 'xyz':
        layer = RasterLayers.XYZLayer({
          url,
          visible,
          minZoom,
          maxZoom,
          attributions,
          projection,
          crossOrigin
        });
        break;
      case 'arcgismapserver':
        layer = RasterLayers.TiledArgisMapServer({
          url,
          visible,
          projection,
          attributions
        });
        break;
      default:
    }
    return layer;
  }
};

BaseLayers.WMS = {
  get({url, projection, attributions, layers, singleTile=false, opacity=1}){
    return RasterLayers.WMSLayer({
      url,
      projection,
      attributions,
      layers,
      tiled: singleTile,
      opacity
    })
  }
};

BaseLayers.WMTS = {
  get({url, layer, visible, attributions, matrixSet, projection, requestEncoding, style='default', format='image/png', opacity=0.7} = {}) {
    const projectionExtent = projection.getExtent();
    const resolutions = new Array(14);
    const size = ol.extent.getWidth(projectionExtent) / 256;
    const matrixIds = new Array(14);
    for (var z = 0; z < 14; ++z) {
      // generate resolutions and matrixIds arrays for this WMTS
      resolutions[z] = size / Math.pow(2, z);
      matrixIds[z] = z;
    }
    return new ol.layer.Tile({
      opacity,
      source: new ol.source.WMTS({
        url,
        projection,
        layer,
        matrixSet,
        requestEncoding,
        format,
        attributions,
        tileGrid: new ol.tilegrid.WMTS({
          origin: ol.extent.getTopLeft(projectionExtent),
          resolutions: resolutions,
          matrixIds: matrixIds
        }),
        style
      })
    });
  }
};

BaseLayers.BING = {};

BaseLayers.BING.get = (config={})=>{
  const imagerySet = config.imagerySet || 'Aerial'; // 'Road', 'AerialWithLabels', 'Aerial'
  return new ol.layer.Tile({
    name: imagerySet,
    visible: false,
    preload: Infinity,
    source: new ol.source.BingMaps({
      imagerySet: imagerySet,
      key: config.key
    }),
    basemap: true
  });
};

module.exports = BaseLayers;
