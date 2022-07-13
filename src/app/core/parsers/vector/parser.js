const { toRawType } = require('core/utils/utils');

const VectorParser = function () {
  // return the right parser for the request
  this.get = function (options = {}) {
    const { type } = options;
    let parser;
    switch (type) {
      case 'geojson':
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
  this._parseLayermsGMLOutput = function ({ data, layer }) {
    try {
      let gml;
      // to extract gml from multiple (Tuscany region)
      if (data.substr(0, 2) !== '--') gml = data;
      else {
        const gmlTag1 = new RegExp('<([^ ]*)FeatureCollection');
        const gmlTag2 = new RegExp('<([^ ]*)msGMLOutput');
        const boundary = '\r\n--';
        const parts = data.split(new RegExp(boundary));
        parts.forEach((part) => {
          const isGmlPart = part.search(gmlTag1) > -1 ? true : part.search(gmlTag2) > -1;
          if (isGmlPart) {
            gml = part.substr(part.indexOf('<?xml'));
          }
        });
      }
      const layers = layer.getQueryLayerOrigName();
      const parser = new ol.format.WMSGetFeatureInfo({
        layers,
      });
      return parser.readFeatures(gml);
    } catch (err) {
      return [];
    }
  };

  this._parseLayerGeoJSON = function (data, options) {
    try {
      data = toRawType(data) === 'String' ? JSON.parse(data) : data;
      const { crs, mapCrs } = options;
      const geojson = new ol.format.GeoJSON({
        dataProjection: crs,
        featureProjection: mapCrs || crs,
        geometryName: 'geometry',
      });
      return geojson.readFeatures(data);
    } catch (err) {
      return [];
    }
  };
};

module.exports = new VectorParser();
