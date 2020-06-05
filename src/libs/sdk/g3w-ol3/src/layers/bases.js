import { BING_API_KEY } from '../../config/config';
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
  get: function({url, layer, visible, attributions, crs, format='image/png', opacity=0.7} = {}) {
    const projection = Projections.get(`EPSG:${crs}`);
    const projectionExtent = projection.getExtent();
    const size = ol.extent.getWidth(projectionExtent) / 256;
    const matrixIds = [];
    const resolutions = [];
    for (var i = 0; i < 18; i++) {
      matrixIds[i] = i.toString();
      resolutions[i] = size / Math.pow(2, i);
    }
    url = 'https://hazards.fema.gov/gis/nfhl/rest/services/FIRMette/NFHLREST_FIRMette/MapServer/16';
    return new ol.layer.Tile({
      opacity,
      source: new ol.source.TileArcGISRest({
        url
      })
    })
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
    // use maxZoom 19 to see stretched tiles instead of the BingMaps
    // "no photos at this zoom level" tiles
    // maxZoom: 19
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
      // use maxZoom 19 to see stretched tiles instead of the BingMaps
      // "no photos at this zoom level" tiles
      // maxZoom: 19
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
      // use maxZoom 19 to see stretched tiles instead of the BingMaps
      // "no photos at this zoom level" tiles
      // maxZoom: 19
  }),
  basemap: true
});

module.exports = BaseLayers;
