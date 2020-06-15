import { BING_API_KEY } from 'config/keys';
const Projections = require('../projection/projections');
const BaseLayers = {};

BaseLayers.OSM = new ol.layer.Tile({
  source: new ol.source.OSM(),
  id: 'osm',
  title: 'OSM',
  basemap: true
});

BaseLayers.TMS =  {
  get: function({visible=false, url=null, source_type="xyz", minZoom, maxZoom, projection, attributions}={}) {
    let source;
    switch(source_type) {
      case 'xyz':
        source = new ol.source.XYZ({
          url,
          minZoom,
          maxZoom,
          attributions,
          projection
        });
        break;
      case 'arcgismapserver':
        source = new ol.source.TileArcGISRest({
          url,
          projection,
          attributions
        });
        break;
      default:
    }
    return new ol.layer.Tile({
      visible,
      source,
      basemap: true
    })
  }
};


BaseLayers.WMTS = {
  get: function({url, layer, visible, attributions, matrixSet, crs, requestEncoding, style='default', format='image/png', opacity=0.7} = {}) {
    const projection = Projections.get(`EPSG:${crs}`);
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

BaseLayers.BING.Road = new ol.layer.Tile({
  name:'Road',
  visible: false,
  preload: Infinity,
  source: new ol.source.BingMaps({
    key: BING_API_KEY,
    imagerySet: 'Road'
  }),
  basemap: true
});

BaseLayers.BING.AerialWithLabels = new ol.layer.Tile({
  name: 'AerialWithLabels',
  visible: false,
  preload: Infinity,
  source: new ol.source.BingMaps({
    key: BING_API_KEY,
    imagerySet: 'AerialWithLabels'
  }),
  basemap: true
});

BaseLayers.BING.Aerial = new ol.layer.Tile({
  name: 'Aerial',
  visible: false,
  preload: Infinity,
  source: new ol.source.BingMaps({
    key: BING_API_KEY,
    imagerySet: 'Aerial'
  }),
  basemap: true
});

module.exports = BaseLayers;
