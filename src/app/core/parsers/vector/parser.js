const VectorParser = function() {
  // return the right parser for the request
  this.get = function(options={}) {
    const type = options.type;
    let parser;
    switch (type) {
      case 'json':
        parser = this._parseLayerGeoJSON;
        break;
      case 'gml':
        parser = this._parseLayermsGMLOutput;
        break;
      default:
        parser = this._parseLayerGeoJSON;
    }
    return parser;
  };
  this._parseLayermsGMLOutput = function(data) {
    const layers = this._layer.getQueryLayerOrigName();
    const parser = new ol.format.WMSGetFeatureInfo({
      layers
    });
    return parser.readFeatures(data);
  };

  this._parseLayerGeoJSON = function(data, options) {
    const {crs, mapCrs} = options;
    const geojson = new ol.format.GeoJSON({
      //defaultDataProjection: crs, //ol vs4.5
      dataProjection: crs,
      featureProjection: mapCrs || crs,
      geometryName: "geometry"
    });
    return geojson.readFeatures(data);
  };
};

module.exports = new VectorParser();
