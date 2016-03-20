var config = {
  baseUrl: "",
  group: {
    name: 'Test group',
    id: 'test_group',
    minscale:100000000,
    maxscale:1,
    crs: 32632,
    baselayers: [], // "OSM", "BING_TERRAIN", "BING_SATELLITE", "BING_HYBRID", "BING_ROADS"
    projects: [
      {
          type: 'qdjango',
          name: 'Open Data Firenze',
          id: 'open_data_firenze',
          gid: 'qdjango:open_data_firenze',
      },
    ],
    initproject: 'qdjango:open_data_firenze',
    overviewproject: null
  }
};

module.exports = config;
