/**
 * @file ORIGINAL SOURCE: src/app/core/utils/parsers.js@3.8
 * 
 * @since 3.9.0
 */

import { G3W_FID }                         from 'app/constant';
import GUI                                 from 'services/gui';
import { is3DGeometry }                    from 'utils/is3DGeometry';
import { removeZValueToOLFeatureGeometry } from 'utils/removeZValueToOLFeatureGeometry';
import { sanitizeFidFeature }              from 'utils/sanitizeFidFeature';
import { reverseGeometry }                 from 'utils/reverseGeometry';

const { toRawType }                        = require('utils');
const Feature                              = require('core/layers/features/feature');
const { t }                                = require('core/i18n/i18n.service');

const WORD_NUMERIC_FIELD_ESCAPE = 'GIS3W_ESCAPE_NUMERIC_FIELD_';

/**
 * Response parser (internal utilities)
 */
const utils = {
  getHandledResponsesFromResponse({response, layers, projections, id=false}) {
    let multilayers = false;
    const x2js = new X2JS();
    const jsonresponse =  x2js.xml_str2json(response);
    // in case of parser return null
    if (!jsonresponse) return [{
      layer: layers[0],
      features: []
    }];
    /** @since v3.9.1 ServiceExceptionReport is an attribute of json response from server in case of error */
    const { FeatureCollection, ServiceExceptionReport } = jsonresponse;
    const handledResponses = [];
    if (FeatureCollection && FeatureCollection.featureMember) {
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
          const groupFeatures = this.groupFeaturesByFields(featureMemberArrayAndPrefix.features);
          //check if features have different fields (multilayers)
          if (Object.keys(groupFeatures).length > 1) {
            // is a multilayers. Each feature has different fields
            multilayers = true;
            this.handleWMSMultiLayersResponseFromQGISSERVER({
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
          const handledResponse = this.parseLayerFeatureCollection({
            jsonresponse,
            layer,
            projections
          });
          handledResponse && handledResponses.unshift(handledResponse[0]);
        }
      }
    }
    // in case of ServiceExceptionReport
    if (ServiceExceptionReport && ServiceExceptionReport.ServiceException) {
       GUI.showUserMessage({
         type: 'warning',
         textMessage: true,
         message: `${layers[0].getName()} - ${ServiceExceptionReport.ServiceException}`
       })
    }
    return handledResponses;
  },
  transformFeatures(features, projections) {
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
        if (invertedAxis) features = this.reverseFeaturesCoordinates(features)
      }
    }
    return features;
  },
  parseLayerFeatureCollection({jsonresponse, layer, projections}) {
    const x2js = new X2JS();
    const layerFeatureCollectionXML = x2js.json2xml_str(jsonresponse);
    const parser = new ol.format.WMSGetFeatureInfo();
    const features = this.transformFeatures(parser.readFeatures(layerFeatureCollectionXML), projections);
    if (layer.isGeoLayer()) {
      const geometryType = layer.getGeometryType();

      // Need to remove Z values due a incorrect addition when using
      // ol.format.WMSGetFeatureInfo readFeatures method from XML
      // (eg. WMS getFeatureInfo);
      if (!is3DGeometry(geometryType)){
        features.forEach(feature => removeZValueToOLFeatureGeometry({ feature }));
      }
    }

    if (features.length && this.hasFieldsStartWithNotPermittedKey) {
      const properties = Object.keys(features[0].getProperties());
      const numericFields = properties.filter(property => property.indexOf(WORD_NUMERIC_FIELD_ESCAPE) !== -1);
      features.forEach(feature => {
        numericFields.forEach(_field => {
          const value = feature.get(_field);
          const ori_field = _field.replace(WORD_NUMERIC_FIELD_ESCAPE, '');
          feature.set(this.hasFieldsStartWithNotPermittedKey[ori_field], Array.isArray(value) ? value[0] : value);
          feature.unset(_field);
        })
      });
    }
    return [{
      layer,
      features
    }]
  },
  reverseFeaturesCoordinates(features) {
    features.forEach(feature => {
      const geometry = feature.getGeometry();
      feature.setGeometry(reverseGeometry(geometry))
    });
    return features
  },
  handleXMLStringResponseBeforeConvertToJSON({response, layers, wms}={}) {
    if (!response) return; // return undefined if no response
    if (!(typeof response === 'string'|| response instanceof String)) {
      response = new XMLSerializer().serializeToString(response);
    }
    for (let i=0; i < layers.length; i++) {
      const layer = layers[i];
      let originalName = (wms && layer.isWmsUseLayerIds()) ? layer.getId(): layer.getName();
      let sanitizeLayerName = wms ? originalName.replace(/[/\s]/g, '') : originalName.replace(/\s+/g, '_');
      sanitizeLayerName     = sanitizeLayerName.replace(/(\'+)/, '');
      sanitizeLayerName     = sanitizeLayerName.replace(/(\)+)/, '');
      sanitizeLayerName     = sanitizeLayerName.replace(/(\(+)/, '');
      sanitizeLayerName     = wms ? sanitizeLayerName : sanitizeLayerName.replace(/\//g, '');
      sanitizeLayerName     = wms ? sanitizeLayerName : sanitizeLayerName.replace(/\:/g, '-');

      const reg = new RegExp(`qgs:${sanitizeLayerName}`, "g");
      response = response.replace(reg, `qgs:layer${i}`);
    }
    // add match numeric value integer or float
    const arrayQGS = [...response.matchAll(/qgs:(\d+(?:\.\d+)?)(\w+)/g), ...response.matchAll(/qgs:(\w+):(\w+)/g)];
    arrayQGS.forEach((find, idx) => {
      if (idx%2 === 0) {
        if (!this.hasFieldsStartWithNotPermittedKey) this.hasFieldsStartWithNotPermittedKey = {};
        const originalField = find[0].replace('qgs:', '');
        this.hasFieldsStartWithNotPermittedKey[`${find[1]}${find[2]}`] = originalField;
        const regex = new RegExp(`${find[0]}`, "g");
        response = response.replace(regex, `qgs:${WORD_NUMERIC_FIELD_ESCAPE}${find[1]}${find[2]}`)
      }
    });
    //PATCH id strange
    const strangeChar = new RegExp(`${String.fromCharCode(0)}`, "g");
    response = response.replace(strangeChar, '0');
    ///
    return response;
  },
  groupFeaturesByFields(features) {
    return _.groupBy(features, feature => Object.keys(feature));
  },
  handleWMSMultiLayersResponseFromQGISSERVER({groupFeatures, prefix, handledResponses, jsonresponse, layer, projections} = {}){
    // is a multilayers. Each feature has different fields. If group has more that one feature spit it and create single features
    Object.keys(groupFeatures).forEach((key, index) => {
      const features = groupFeatures[key];
      features.forEach((feature, sub_index) => {
        jsonresponse.FeatureCollection.featureMember = {
          [`layer${index}_${sub_index}`]: feature,
          __prefix: prefix
        };
        const handledResponse = this.parseLayerFeatureCollection({
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
  },
};

/**
 * Response parser (content types)
 */
const contenttypes = {
  'application/json'({layers=[], response, projections, wms=true}={}) {
    const layersFeatures = [];
    const layersId = layers.map(layer => {
      layersFeatures.push({
        layer,
        features: []
      });
      return wms ? layer.getWMSLayerName() : layer.getWFSLayerName();
    });
    const data = response;
    const parseData = () => {
      const defaultDataProjection = projections.layer || projections.map;
      const geojson = new ol.format.GeoJSON({
        defaultDataProjection,
        geometryName: "geometry"
      });
      return geojson.readFeatures(data);
    };
    const features = data && parseData();
    features.filter(feature => {
      const featureId = feature.getId();
      const g3w_fid = sanitizeFidFeature(featureId);
      // in case of wms getfeature without filter return string contain layerName or layerid
      const index = featureId == g3w_fid ? 0 : layersId.indexOf(featureId);
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
  },
  'application/geojson'({layers, projections, response}={}){
    const handleResponse = [];
    const parserGEOJson = Parsers.vector.get({
      type: 'geojson'
    });
    if (response) {
      layers.forEach(layer =>{
        handleResponse.push({
          layer,
          features: parserGEOJson(response, {})
        })
      })
    }
    return handleResponse;
  },
  'text/html'({layers, response}={}){
    const handleResponse = [];
    layers.forEach(layer =>{
      handleResponse.push({
        layer,
        rawdata: response
      })
    });
    return handleResponse;
  },
  'text/plain'({layers, response}={}){
    const handleResponse = [];
    layers.forEach(layer =>{
      handleResponse.push({
        layer,
        rawdata: response
      })
    });
    return handleResponse;
  },
  'text/gml'({layers, response}){
    const parserGML = Parsers.vector.get({
      type: 'gml'
    });
    const features = parserGML({
      data:response,
      layer: layers[0]
    });
    return layers.map(layer =>({
      layer,
      features
    }));
  },
  'application/vnd.ogc.gml'({response, projections, layers, wms=true}={}){
    return utils.getHandledResponsesFromResponse({
      response: utils.handleXMLStringResponseBeforeConvertToJSON({
        layers,
        response,
        wms
      }),
      layers,
      projections
    });
  },
  not_supported_format({layers=[]}={}){
    return layers.map(layer=>({
      layer,
      rawdata: t('warning.not_supported_format')
    }))
  }
};

/**
 * Vector parser
 */
const VectorParser = function() {
  // return the right parser for the request
  this.get = function(options={}) {
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
  this._parseLayermsGMLOutput = function({data, layer}) {
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
      const parser = new ol.format.WMSGetFeatureInfo({
        layers
      });
      return parser.readFeatures(gml);
    } catch(err){
      return [];
    }
  };

  this._parseLayerGeoJSON = function(data, options) {
    try {
      data = toRawType(data) === 'String' ? JSON.parse(data): data;
      const {crs, mapCrs} = options;
      const geojson = new ol.format.GeoJSON({
        dataProjection: crs,
        featureProjection: mapCrs || crs,
        geometryName: "geometry"
      });
      return geojson.readFeatures(data);
    } catch(err){
      return [];
    }

  };
};

/**
 * Table parser
 */
const TableParser = function() {
  this.get = function(options={}) {
    const type = options.type;
    let parser;
    switch (type) {
      case 'json':
        parser = this._parserJSON.bind(this);
        break;
      default:
        parser = this._parserJSON.bind(this);
    }
    return parser;
  };

  this._parserJSON = function(data={}) {
    const {features=[]} = data;
    return features.map(_feature => {
      const {id, properties} = _feature;
      const feature = new Feature();
      feature.setProperties(properties);
      feature.setId(id);
      return feature;
    });
  }
};

const Parsers = {
  vector: new VectorParser(),
  table: new TableParser(),
  /**
   * @TODO wrap within dedicated class (ie. new ResponseParser())
   */
  response: {
    get(type){
      return contenttypes[type] || contenttypes.not_supported_format;
    },
    utils: {
      getTimeoutData(layers=[]){
        return layers.map(layer=>({
          layer,
          rawdata: 'timeout'
        }))
      }
    }
  }
};

module.exports = Parsers;
