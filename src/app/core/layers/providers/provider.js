import {G3W_FID} from 'constant';
const {base, inherit} = require('core/utils/utils');
const geoutils = require('g3w-ol/src/utils/utils');
const G3WObject = require('core/g3wobject');
const {geometryFields, sanitizeFidFeature, query} =  require('core/utils/geo');
const parser = require('core/parsers/vector/parser');
const WORD_NUMERIC_XML_TAG_ESCAPE = 'GIS3W_ESCAPE_NUMERIC_';
const WORD_NUMERIC_FIELD_ESCAPE = 'GIS3W_ESCAPE_NUMERIC_FIELD_';

function Provider(options = {}) {
  this._isReady = false;
  this._name = 'provider';
  this._layer = options.layer;
  this._hasFieldsStartWithNotPermittedKey;
  base(this);
}

inherit(Provider, G3WObject);

const proto = Provider.prototype;

proto.getLayer = function() {
  return this._layer;
};

proto.setLayer = function(layer) {
  this._layer = layer;
};

proto.getFeatures = function() {
  console.log('overwriteby single provider')
};

proto.query = function() {
  console.log('overwriteby single provider')
};

proto.setReady = function(bool) {
  this._isReady = bool;
};

proto.isReady = function() {
  return this._isReady;
};

proto.error = function() {};

proto.isValid = function() {
  console.log('overwriteby single provider');
};

proto.getName = function() {
  return this._name;
};

// Method to transform xml from server to present to queryreult component
proto.handleQueryResponseFromServer = function(response, projections, layers, wms=true) {
  layers = layers ? layers : [this._layer];
  const layer = layers[0];
  const infoFormat = layer.getInfoFormat();
  let _response;
  switch(infoFormat) {
    case "application/geojson":
      _response = query.parsers[infoFormat]({
        layers,
        response
      });
      break;
    case "application/json":
        _response = query.parsers[infoFormat]({
          layers,
          response,
          projections,
          wms
        });
      break;
    case "text/plain":
    case 'text/html':
      _response = query.parsers[infoFormat]({
        layers,
        response
      });
      break;
    case "text/gml":
      _response = query.parsers[infoFormat]({
        layers,
        projections,
        response
      });
      break;
    case "application/vnd.ogc.gml":
      _response = query.parsers[infoFormat]({
        response,
        layers,
        projections,
        wms
      });
      break;
    case "application/vnd.esri.wms_raw_xml":
    case "application/vnd.esri.wms_featureinfo_xml":
    case "application/vnd.ogc.wms_xml":
    case "text/xml":
    default:
      _response = query.parsers.not_supported_format(layers);
  }
  this._hasFieldsStartWithNotPermittedKey = null;
  return _response;
};

//method to handle application/json response qgis
proto._parseGeoJsonResponse = function({layers=[], response, projections, wms=true}={}) {
  const layersFeatures = [];
  const layersId = layers.map(layer => {
    layersFeatures.push({
      layer,
      features: []
    });
    return wms ? layer.getWMSLayerName() : layer.getWFSLayerName();
  });
  const data = response;
  const features = data && this._parseLayerGeoJSON(data, projections) || [];
  features.filter(feature => {
    const featureId = feature.getId();
    const g3w_fid = sanitizeFidFeature(featureId);
    // in case of wms getfeature without filter return string conatin layerName or layerid
    const index = featureId == g3w_fid ? 0 : layersId.indexOf(currentLayerId);
    if (index !== -1) {
      const fields = layersFeatures[index].layer.getFields().filter(field => field.show);
      const properties = feature.getProperties();
      feature.set(G3W_FID, g3w_fid);
      fields.forEach(field=>{
        if (properties[field.name] === undefined) {
          properties[field.label] !== undefined && feature.set(field.name, properties[field.label])
        }
      });
      layersFeatures[index].features.push(feature);
    }
  });
  return layersFeatures;
};
proto._parseAttributes = function(layerAttributes, featureAttributes) {
  let featureAttributesNames = Object.keys(featureAttributes).filter(featureAttributesName=>  geometryFields.indexOf(featureAttributesName) === -1);
  if (layerAttributes && layerAttributes.length) {
    let featureAttributesNames = Object.keys(featureAttributes);
    return layerAttributes.filter(attribute => featureAttributesNames.indexOf(attribute.name) > -1)
  } else {
    return featureAttributesNames.map(featureAttributesName => ({
        name: featureAttributesName,
        label: featureAttributesName
      })
    )
  }
};

module.exports = Provider;
