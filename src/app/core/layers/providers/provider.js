import {G3W_FID} from 'constant';
const {base, inherit, toRawType} = require('core/utils/utils');
const geoutils = require('g3w-ol/src/utils/utils');
const G3WObject = require('core/g3wobject');
const {geometryFields, sanitizeFidFeature} =  require('core/utils/geo');
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

// to extract gml from multiple (Tuscany region)
proto.extractGML = function (response) {
  if (response.substr(0,2) !== '--')
    return response;
  const gmlTag1 = new RegExp("<([^ ]*)FeatureCollection");
  const gmlTag2 = new RegExp("<([^ ]*)msGMLOutput");
  const boundary = '\r\n--';
  const parts = response.split(new RegExp(boundary));
  parts.forEach((part) => {
    const isGmlPart = part.search(gmlTag1) > -1 ? true : part.search(gmlTag2) > -1 ? true : false;
    if (isGmlPart) {
      const gml = part.substr(part.indexOf("<?xml"));
      return gml;
    }
  });
};

// Method to transform xml from server to present to queryreult component
proto.handleQueryResponseFromServer = function(response, projections, layers, wms=true) {
  layers = layers ? layers : [this._layer];
  const layer = layers[0];
  const infoFormat = layer.getInfoFormat();
  let _response;
  switch(infoFormat) {
    case 'application/json':
      _response = this._parseGeoJsonResponse({
        layers,
        response,
        projections,
        wms
      });
      break;
    case 'application/vnd.ogc.gml':
    default:
      //IN CASE OF application/vnd.ogc.gml always pass to qgisserver
      //if (layer.getType() === "table" || !layer.isExternalWMS() || !layer.isLayerProjectionASMapProjection()) {
      response = this._handleXMLStringResponseBeforeConvertToJSON({
        layers,
        response,
        wms
      });
      _response = this._getHandledResponsesFromResponse({
        response,
        layers,
        projections
        //id: false //used in case of layer id .. but for now is set to false in case of layerid starting with number
      });
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

proto._handleWMSMultilayers = function({layer, response, projections} = {}) {
  const x2js = new X2JS();
  const arrayQGS = [...response.matchAll(/<qgs:(\w+) fid=/g)];
  const alreadySubstitute = [];
  arrayQGS.forEach(element => {
    const fid = element[1];
    if (alreadySubstitute.indexOf(fid) === -1) {
      alreadySubstitute.push(fid);
      const startfid = +fid[0];
      if (Number.isInteger(startfid))
        response = response.replace(new RegExp(`${fid}`, "g"), `${WORD_NUMERIC_XML_TAG_ESCAPE}${fid}`);
    }
  });
  const jsonresponse =  x2js.xml_str2json(response);
  // in case of parser return null
  if (!jsonresponse) return [{
    layer,
    features: []
  }];
  const FeatureCollection = jsonresponse.FeatureCollection;
  const handledResponses = [];
  if (FeatureCollection.featureMember) {
    const originalFeatureMember = Array.isArray(FeatureCollection.featureMember) ? FeatureCollection.featureMember : [FeatureCollection.featureMember];
    let layersNames = new Set();
    originalFeatureMember.forEach((featureMember) => {
      layersNames.add(Object.keys(featureMember)[0]);
    });
    for (const layerName of layersNames) {
      jsonresponse.FeatureCollection.featureMember = originalFeatureMember.filter((feature) => {
        return feature[layerName]
      });
      const handledResponse = this._parseLayerFeatureCollection({
        jsonresponse,
        layer,
        projections
      });
      if (handledResponse) {
        const response = handledResponse[0];
        response.layer = layerName.replace(WORD_NUMERIC_XML_TAG_ESCAPE,'');
        handledResponses.unshift(response);
      }
    }
  }
  return handledResponses;
};

proto._groupFeaturesByFields = function(features) {
  return _.groupBy(features, feature => Object.keys(feature));
};

proto._handleWMSMultiLayersResponseFromQGISSERVER = function({groupFeatures, prefix, handledResponses, jsonresponse, layer, projections} = {}){
  // is a multilayers. Each feature has different fields. If group has more that one feature spit it and create single features
  Object.keys(groupFeatures).forEach((key, index) => {
    const features = groupFeatures[key];
    features.forEach((feature, sub_index) => {
      jsonresponse.FeatureCollection.featureMember = {
        [`layer${index}_${sub_index}`]: feature,
        __prefix: prefix
      };
      const handledResponse = this._parseLayerFeatureCollection({
        jsonresponse,
        layer,
        projections
      });
      if (handledResponse) {
        const response = handledResponse[0];
        response.layer = layer;
        handledResponses.unshift(response);
      }
    });
  });
};

proto._getHandledResponsesFromResponse = function({response, layers, projections, id=false}) {
  let multilayers = false;
  const x2js = new X2JS();
  const jsonresponse =  x2js.xml_str2json(response);
  // in case of parser return null
  if (!jsonresponse) return [{
    layer: layers[0],
    features: []
  }];
  const FeatureCollection = jsonresponse.FeatureCollection;
  const handledResponses = [];
  if (FeatureCollection.featureMember) {
    const originalFeatureMember = Array.isArray(FeatureCollection.featureMember) ? FeatureCollection.featureMember : [FeatureCollection.featureMember];
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const layerName = id ? layer.getId() : `layer${i}`;
      const featureMemberArrayAndPrefix = {
        features: null,
        __prefix: null
      };
      jsonresponse.FeatureCollection.featureMember = originalFeatureMember.filter(feature => {
        const featureMember = feature[layerName];
         if (featureMember) {
           featureMember.g3w_fid = {
             __prefix: feature.__prefix,
             __text: featureMember._fid && featureMember._fid.split('.')[1]
           };
           if (Array.isArray(featureMember)){
             featureMemberArrayAndPrefix.features = featureMember;
             featureMemberArrayAndPrefix.__prefix = feature.__prefix;
             return false;
           }
           return true;
         }
      });
      if (featureMemberArrayAndPrefix.features) {
        const prefix = featureMemberArrayAndPrefix.__prefix;
        // check if features have the same fields. If not group the features with the same fields
        const groupFeatures = this._groupFeaturesByFields(featureMemberArrayAndPrefix.features);
        //check if features have different fields (multilayers)
        if (Object.keys(groupFeatures).length > 1) {
          // is a multilayers. Each feature has different fields
          multilayers = true;
          this._handleWMSMultiLayersResponseFromQGISSERVER({
            groupFeatures,
            prefix,
            handledResponses,
            jsonresponse,
            layer,
            projections
          })
        } else {
          featureMemberArrayAndPrefix.features.forEach(feature => {
            //for Each element have to add and object contain layerName and information, and __prefix
            jsonresponse.FeatureCollection.featureMember.push({
              [layerName]: feature,
              __prefix: prefix
            })
          });
        }
      }
      if (!multilayers) {
        const handledResponse = this._parseLayerFeatureCollection({
          jsonresponse,
          layer,
          projections
        });
        handledResponse && handledResponses.unshift(handledResponse[0]);
      }
    }
  }
  return handledResponses;
};

proto._handleXMLStringResponseBeforeConvertToJSON = function({response, layers, wms}={}) {
  if (!response) return; // return undefined if non response
  if (!(typeof response === 'string'|| response instanceof String))
    response = new XMLSerializer().serializeToString(response);
  for (let i=0; i < layers.length; i++) {
    const layer = layers[i];
    let originalName = (wms && layer.isWmsUseLayerIds()) ? layer.getId(): layer.getName();
    let sanitizeLayerName = wms ? originalName.replace(/[/\s]/g, '') : originalName.replace(/[/\s]/g, '_');
    sanitizeLayerName = sanitizeLayerName.replace(/(\'+)/, '');
    sanitizeLayerName = sanitizeLayerName.replace(/(\)+)/, '');
    sanitizeLayerName = sanitizeLayerName.replace(/(\(+)/, '');
    const reg = new RegExp(`qgs:${sanitizeLayerName}\\b`, "g");
    response = response.replace(reg, `qgs:layer${i}`);
  }
  const arrayQGS = [...response.matchAll(/qgs:(\d+)(\w+)/g), ...response.matchAll(/qgs:(\w+):(\w+)/g)];
  arrayQGS.forEach((find, idx) => {
    if (idx%2 === 0) {
      if (!this._hasFieldsStartWithNotPermittedKey) this._hasFieldsStartWithNotPermittedKey = {};
      const originalField = find[0].replace('qgs:', '');
      this._hasFieldsStartWithNotPermittedKey[`${find[1]}${find[2]}`] = originalField;
      const regex = new RegExp(`${find[0]}`, "g");
      response = response.replace(regex, `qgs:${WORD_NUMERIC_FIELD_ESCAPE}${find[1]}${find[2]}`)
    }
  });
  //PATCH id strange
  const strangeChar = new RegExp(`${String.fromCharCode(0)}`, "g");
  response = response.replace(strangeChar, '0');
  ///
  return response;
};

// digest result
proto.digestFeaturesForLayers = function(featuresForLayers) {
  let id = 0;
  let layers = [];
  let layerAttributes,
    layerTitle,
    layerId;
  featuresForLayers.forEach((featuresForLayer) => {
    const layer = featuresForLayer.layer;
    layerAttributes = layer.getAttributes();
    layerTitle = layer.getTitle();
    layerId = layer.getId();

    const layerObj = {
      title: layerTitle,
      id: layerId,
      attributes: [],
      features: [],
      hasgeometry: false,
      show: true,
      expandable: true,
      hasImageField: false, // check if image filed exist
      error: ''
    };

    // check if exist feature related to the layer
    if (featuresForLayer.features && featuresForLayer.features.length) {
      // get aonly attributes returned by WMS (using the first feature availble)
      layerObj.attributes = this._parseAttributes(layerAttributes, featuresForLayer.features[0].getProperties());
      // check if exist image field
      layerObj.attributes.forEach((attribute) => {
        layerObj.hasImageField = attribute.type === 'image';
      });
      // loop throught selected features from query result
      featuresForLayer.features.forEach((feature) => {
        const fid = feature.getId() ? feature.getId() : id;
        const geometry = feature.getGeometry();
        // check if feature has geometry
        layerObj.hasgeometry = geometry && true || false;
        // create feature object
        const featureObj = {
          id: fid,
          attributes: feature.getProperties(),
          geometry,
          show: true
        };
        layerObj.features.push(featureObj);
        id += 1;
      });
      layers.push(layerObj);
    }
    else if (featuresForLayer.error){
      layerObj.error = featuresForLayer.error;
    }
  });
  return layers;
};

proto._parseAttributes = function(layerAttributes, featureAttributes) {
  let featureAttributesNames = _.keys(featureAttributes);
  featureAttributesNames = _.filter(featureAttributesNames,function(featureAttributesName) {
    return geometryFields.indexOf(featureAttributesName) === -1;
  });
  if (layerAttributes && layerAttributes.length) {
    let featureAttributesNames = _.keys(featureAttributes);
    return _.filter(layerAttributes,function(attribute){
      return featureAttributesNames.indexOf(attribute.name) > -1;
    })
  } else {
    return _.map(featureAttributesNames, function(featureAttributesName) {
      return {
        name: featureAttributesName,
        label: featureAttributesName
      }
    })
  }
};

proto._transformFeatures = function(features, projections) {
  if (features.length) {
    if(!!features[0].getGeometry()) {
      const mainProjection = projections.layer ? projections.layer : projections.map;
      const invertedAxis = mainProjection.getAxisOrientation().substr(0,2) === 'ne';
      if (projections.layer && (projections.layer.getCode() !== projections.map.getCode())) {
        features.forEach(feature => {
          const geometry = feature.getGeometry();
          feature.setGeometry(geometry.transform(projections.layer.getCode(), projections.map.getCode()))
        })
      }
      if (invertedAxis) features = this._reverseFeaturesCoordinates(features)
    }
  }
  return features;
};

proto._parseLayerFeatureCollection = function({jsonresponse, layer, projections}) {
  const x2js = new X2JS();
  const layerFeatureCollectionXML = x2js.json2xml_str(jsonresponse);
  const parser = new ol.format.WMSGetFeatureInfo();
  const features = this._transformFeatures(parser.readFeatures(layerFeatureCollectionXML), projections);
  if (features.length && this._hasFieldsStartWithNotPermittedKey) {
    const properties = Object.keys(features[0].getProperties());
    const numericFields = properties.filter(property => property.indexOf(WORD_NUMERIC_FIELD_ESCAPE) !== -1);
    features.forEach(feature => {
      numericFields.forEach(_field => {
        const value = feature.get(_field);
        const ori_field = _field.replace(WORD_NUMERIC_FIELD_ESCAPE, '');
        feature.set(this._hasFieldsStartWithNotPermittedKey[ori_field], Array.isArray(value)? value[0] : value);
        feature.unset(_field);
      })
    });
    this._hasFieldsStartWithNumber = false;
  }
  return [{
    layer,
    features
  }]
};

proto._reverseFeaturesCoordinates = function(features) {
  features.forEach(feature => {
    const geometry = feature.getGeometry();
    feature.setGeometry(geoutils.reverseGeometry(geometry))
  });
  return features
};

proto._parseLayermsGMLOutput = function(data) {
  const layers = this._layer.getQueryLayerOrigName();
  const parser = new ol.format.WMSGetFeatureInfo({
    layers
  });
  return parser.readFeatures(data);
};

proto._parseLayerGeoJSON = function(data, projections) {
  const defaultDataProjection = projections.layer || projections.map;
  const geojson = new ol.format.GeoJSON({
    defaultDataProjection,
    geometryName: "geometry"
  });
  return geojson.readFeatures(data);
};


module.exports = Provider;
