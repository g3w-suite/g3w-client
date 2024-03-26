const RasterLayers = require('g3w-ol/layers/rasters');
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
  get({
      url,
      layer,
      visible, /** @TODO check if deprecate */
      attributions,
      matrixSet,
      projection,
      requestEncoding,
      style='default',
      format='image/png',
      opacity = 0.7,
      grid, /** @since 3.10.0 */
      grid_extent, /** @since 3.10.0 */
      extent, /** @since 3.10.0 */
    } = {}) {
    if (matrixSet) {
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
            resolutions,
            matrixIds
          }),
          style
        })
      });
    }
    /** @since 3.10.0 WMTS based on mapproxy*/
    if (grid && grid_extent) {
      const resolutions = ol.tilegrid.createXYZ({ extent }).getResolutions();
      return new ol.layer.Tile({
        source: new ol.source.WMTS({
          url,
          layer,
          matrixSet: grid,
          format: format || 'png',
          projection,
          tileGrid: new ol.tilegrid.WMTS({
            origin: ol.extent.getTopLeft(grid_extent),
            resolutions,
            matrixIds: resolutions.map((_, i) => i),
          }),
          style,
          transparent: false,
        })
      });
    }
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
