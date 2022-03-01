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
  this._parseLayermsGMLOutput = function({data, layer}) {
    let gml;
    // to extract gml from multiple (Tuscany region)
    if (data.substr(0,2) !== '--') gml = data;
    else {
      const gmlTag1 = new RegExp("<([^ ]*)FeatureCollection");
      const gmlTag2 = new RegExp("<([^ ]*)msGMLOutput");
      const boundary = '\r\n--';
      const parts = data.split(new RegExp(boundary));
      parts.forEach((part) => {
        const isGmlPart = part.search(gmlTag1) > -1 ? true : part.search(gmlTag2) > -1 ? true : false;
        if (isGmlPart) {
          gml = part.substr(part.indexOf("<?xml"));
        }
      });
    }
    const layers = layer.getQueryLayerOrigName();
    const parser = new ol.format.WMSGetFeatureInfo({
      layers
    });
    return parser.readFeatures(gml);
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
