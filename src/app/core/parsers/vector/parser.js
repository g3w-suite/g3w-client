import utils from 'core/utils/utils';
import {GeoJSON, WMSGetFeatureInfo} from "ol/format";

class VectorParser {
  constructor(props) {}
  // return the right parser for the request
  get(options={}) {
    const type = options.type;
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
  _parseLayermsGMLOutput({data, layer}) {
    try {
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
      const parser = new WMSGetFeatureInfo({
        layers
      });
      return parser.readFeatures(gml);
    } catch(err){
      return [];
    }
  };

  _parseLayerGeoJSON(data, options) {
    try {
      data = utils.toRawType(data) === 'String' ? JSON.parse(data): data;
      const {crs, mapCrs} = options;
      const geojson = new GeoJSON({
        dataProjection: crs,
        featureProjection: mapCrs || crs,
        geometryName: "geometry"
      });
      return geojson.readFeatures(data);
    } catch(err){
      return [];
    }
  };
}

export default  new VectorParser();
