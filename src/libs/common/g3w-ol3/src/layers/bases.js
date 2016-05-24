var BaseLayers = {};

BaseLayers.OSM = new ol.layer.Tile({
  source: new ol.source.OSM({
    attributions: [
      new ol.Attribution({
        html: 'All maps &copy; ' +
            '<a href="http://www.openstreetmap.org/">OpenStreetMap</a>'
      }),
      ol.source.OSM.ATTRIBUTION
    ],
    url: 'http://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    crossOrigin: null
  }),
  id: 'osm',
  title: 'OSM',
  basemap: true
});

BaseLayers.BING = {};

BaseLayers.BING.Road = new ol.layer.Tile({
  name:'Road',
  visible: false,
  preload: Infinity,
  source: new ol.source.BingMaps({
    key: 'Am_mASnUA-jtW3O3MxIYmOOPLOvL39dwMvRnyoHxfKf_EPNYgfWM9imqGETWKGVn',
    imagerySet: 'Road'
      // use maxZoom 19 to see stretched tiles instead of the BingMaps
      // "no photos at this zoom level" tiles
      // maxZoom: 19
  }),
  basemap: true
});

BaseLayers.BING.AerialWithLabels = new ol.layer.Tile({
  name: 'AerialWithLabels',
  visible: true,
  preload: Infinity,
  source: new ol.source.BingMaps({
    key: 'Am_mASnUA-jtW3O3MxIYmOOPLOvL39dwMvRnyoHxfKf_EPNYgfWM9imqGETWKGVn',
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
    key: 'Am_mASnUA-jtW3O3MxIYmOOPLOvL39dwMvRnyoHxfKf_EPNYgfWM9imqGETWKGVn',
    imagerySet: 'Aerial'
      // use maxZoom 19 to see stretched tiles instead of the BingMaps
      // "no photos at this zoom level" tiles
      // maxZoom: 19
  }),
  basemap: true
});

module.exports = BaseLayers;
