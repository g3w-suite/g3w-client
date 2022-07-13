const BaseLayers = {
  OSM: require('./osmlayer'),
  Bing: require('./binglayer'),
  TMS: require('./tmslayer'),
  ARCGISMAPSERVER: require('./arcgislayer'),
  WMTS: require('./wmtslayer'),
  WMS: require('./wmslayer'),
};

module.exports = BaseLayers;
