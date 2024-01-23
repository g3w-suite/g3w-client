/**
 * @file
 * 
 * ORIGINAL SOURCE: src/app/core/utils/parsers.js@3.8
 * ORIGINAL SOURCE: src/app/core/errors/parser/servererrorparser.js@3.9.1
 * 
 * @since 3.9.0
 */

import { G3W_FID }                         from 'app/constant';
import GUI                                 from 'services/gui';
import { toRawType }                       from 'utils/toRawType';
import { groupBy }                         from 'utils/groupBy';
import { is3DGeometry }                    from 'utils/is3DGeometry';
import { removeZValueToOLFeatureGeometry } from 'utils/removeZValueToOLFeatureGeometry';
import { sanitizeFidFeature }              from 'utils/sanitizeFidFeature'
import { reverseGeometry }                 from 'utils/reverseGeometry';

const Feature                              = require('core/layers/features/feature');
const { t }                                = require('core/i18n/i18n.service');

Object
  .entries({
    G3W_FID,
    GUI,
    toRawType,
    Feature,
    t,
    is3DGeometry,
    removeZValueToOLFeatureGeometry,
    sanitizeFidFeature,
    reverseGeometry,
  })
  .forEach(([k, v]) => console.assert(undefined !== v, `${k} is undefined`));

const NUMERIC_FIELD = 'GIS3W_ESCAPE_NUMERIC_FIELD_';

/**
 * @example ResponseParser.get('application/vnd.ogc.gml')({ layers, response });
 */
export const ResponseParser = {

  /** Response parser (content types) */
  get(type) {
    switch (type) {

      case 'g3w-error':
        return function(options = {}) {
          let { error } = options;
          return ({
            parse({ type = 'responseJSON' } = {}) {

            /** @FIXME add description */
            if ('responseJSON' === type && error && error.responseJSON && error.responseJSON.error.message) {
              return error.responseJSON.error.message;
            }

            /** @FIXME add description */
            if ('responseJSON' === type && error && error.errors){
              return _traverseErrorMessage(error.errors);
            }

            /** @FIXME add description */
            if ('String' === type && 'string' === typeof error) {
              return error;
            }

            /** @FIXME add description */
            if ('String' === type) {
              return _traverseErrorMessage(error);
            }

            /** @FIXME add description */
            return t("server_saver_error");
          }})
        };

      case 'g3w-table/json':
        return function(data = {}) {
          return [].concat(data.features).map(f => {
            const feature = new Feature();
            feature.setProperties(f.properties);
            feature.setId(f.id);
            return feature;
          });
        };

      case 'g3w-vector/gml':
        return function ({ data, layer }) {
          try {
            return (
              new ol.format.WMSGetFeatureInfo({ layers: layer.getQueryLayerOrigName() })
              ).readFeatures(
                // extract gml from multiple (Tuscany region)
                '--' === data.substr(0, 2)
                  ? data
                    .split(/\r\n--/)
                    .filter(part => /<([^ ]*)FeatureCollection/.test(part) || /<([^ ]*)msGMLOutput/.test(part))
                    .map(part => part.substr(part.indexOf('<?xml')))
                    .pop()
                  : data
              );
          } catch (err) {
            console.warn(err);
            return [];
          }
        };

      case 'g3w-vector/geojson':
      case 'g3w-vector/json':
        return function (data, options) {
          try {
            return (new ol.format.GeoJSON({
              geometryName:      'geometry',
              dataProjection:    options.crs,
              featureProjection: options.mapCrs || options.crs,
            })).readFeatures(toRawType(data) === 'String' ? JSON.parse(data) : data);
          } catch (err) {
            console.warn(err);
            return [];
          }
        };

      case 'application/json':
        return function ({
          response,
          projections,
          layers = [],
          wms = true,
        } = {}) {
          const layersFeatures = layers.map(layer => ({ layer, features: [] }));
          const layersId       = layers.map(layer => wms ? layer.getWMSLayerName() : layer.getWFSLayerName());
          // features
          (
            response
              ? (new ol.format.GeoJSON({
                  geometryName: 'geometry',
                  defaultDataProjection: projections.layer || projections.map
                })).readFeatures(response)
              : []
          ).filter(feature => {
            const featureId = feature.getId();
            const g3w_fid = sanitizeFidFeature(featureId);
            // in case of wms getfeature without filter return string contain layerName or layerid
            const index = featureId == g3w_fid ? 0 : layersId.indexOf(featureId);
            // skip when ..
            if (-1 === index) {
              return;
            }
            const props = feature.getProperties();
            feature.set(G3W_FID, g3w_fid);
            // fields
            layersFeatures[index]
              .layer
              .getFields()
              .filter(field => field.show && undefined === props[field.name] && undefined !== props[field.label])
              .forEach(field => {
                feature.set(field.name, props[field.label])
              });
            // features
            layersFeatures[index].features.push(feature);
          });
          return layersFeatures;
        };

      case 'application/geojson':
        return function ({
          layers,
          response,
        } = {}) {
          return response ? layers.map(layer => ({
            layer,
            features: ResponseParser.get('g3w-vector/geojson')(response, {}),
          })) : [];
        };

      case 'text/plain':
      case 'text/html':
        return function ({
          layers,
          response,
        } = {}) {
          return layers.map(layer => ({
            layer,
            rawdata: response,
          }));
        };

      case 'text/gml':
        return function ({
          layers,
          response,
        }) {
          return layers.map(layer => ({
            layer,
            features: ResponseParser.get('g3w-vector/gml')({ data: response, layer: layers[0] })
          }));
        };

      case 'application/vnd.ogc.gml':
        return function ({
          response,
          projections,
          layers,
          wms = true,
          id = false,
        } = {}) {

          // convert XML response to string
          if (response && 'string' !== typeof response && !(response instanceof String)) {
            response = new XMLSerializer().serializeToString(response);
          }

          // sanitize layer name (removes: whitespaces, quotes, parenthesis, slashes)
          if (response) {
            response = layers.reduce((acc, layer, i) => {
              const id = (wms && layer.isWmsUseLayerIds() ? layer.getId() : layer.getName()).replace(/[\s'()/]+/g, s => /\s/g.test(s) && !wms ? '_' : '');
              return acc.replace(new RegExp(`qgs:${id}`, 'g'), `qgs:layer${i}`);
            }, response);
          }

          // fields starting with an invalid key
          const invalids = response && Array.from(response.matchAll(/qgs:(\d+(?:\.\d+)?)(\w+)|qgs:(\w+):(\w+)/g)).filter((_, i) => 0 === i % 2);

          // add match numeric value (integer or float)
          if (invalids) {
            response = invalids.reduce((acc, find) => {
              return acc.replace(new RegExp(find[0], 'g'), `qgs:${NUMERIC_FIELD}${find[1]}${find[2]}`);
            }, response);
          }

          // PATCH id strange char
          if (response) {
            response = response.replace(new RegExp(String.fromCharCode(0), 'g'), '0');
          }

          // convert XML string response to JSON
          const x2js = new X2JS();
          const json = x2js.xml_str2json(response); // json response

          // in case of parser return null
          if (!json) {
            return [{
              layer: layers[0],
              features: [],
            }];
          }

          /** @since 3.9.1 ServiceExceptionReport is a json attribute returned by server in case of error */
          if (json.ServiceExceptionReport && json.ServiceExceptionReport.ServiceException) {
            GUI.showUserMessage({
              type: 'warning',
              textMessage: true,
              message: `${layers[0].getName()} - ${json.ServiceExceptionReport.ServiceException}`
            })
          }

          // skip when ..
          if (!json.FeatureCollection || !json.FeatureCollection.featureMember) {
            return [];
          }

          // parse layer feature collection
          const xml            = x2js.json2xml_str(json); // layer Feature Collection XML
          const olfeatures     = (new ol.format.WMSGetFeatureInfo()).readFeatures(xml);

          const is_reprojected = (
            olfeatures.length &&
            !!olfeatures[0].getGeometry() &&
            projections.layer &&
            projections.layer.getCode() !== projections.map.getCode()
          );

          /** @FIXME add description */
          if (olfeatures.length && invalids) {
            const fields = Object.keys(olfeatures[0].getProperties()).filter(prop => -1 !== prop.indexOf(NUMERIC_FIELD));
            olfeatures.forEach(f => {
              fields.forEach(_field => {
                const invalid = invalids.find((find) => `${find[1]}${find[2]}` === _field.replace(NUMERIC_FIELD, ''));
                f.set(invalid[0].replace('qgs:', ''), [].concat(f.get(_field))[0]);
                f.unset(_field);
              })
            });
          }

          // transform features
          if (is_reprojected) {
            olfeatures.forEach(f => f.setGeometry(f.getGeometry().transform(projections.layer.getCode(), projections.map.getCode())))
          }

          // inverted axis --> reverse features coordinates
          if (is_reprojected && 'ne' === (projections.layer ? projections.layer : projections.map).getAxisOrientation().substr(0, 2)) {
            olfeatures.forEach(f => f.setGeometry(reverseGeometry(f.getGeometry())));
          }

          // handled responses
          const parsed = [];

          const originalFeatureMember = [].concat(json.FeatureCollection.featureMember);

          layers.forEach((layer, i/*, originalFeatureMember*/) => {

              const name   = id ? layer.getId() : `layer${i}`;                                    // layer name
              const fname  = originalFeatureMember.filter(f => f[name]);                          // features with same name
              let features = fname.filter(f => Array.isArray(f[name])).map(f => f[name]).pop();   // feature member array
              let prefix   = fname.filter(f => Array.isArray(f[name])).map(f => f.__prefix).pop();// feature member prefix

              fname
                .forEach(f => {
                  f[name].g3w_fid = {
                    __prefix: f.__prefix,
                    __text:   f[name]._fid && f[name]._fid.split('.')[1]
                  };
                });

              // check if features have the same fields. If not group the features with the same fields
              const grouped    = features && groupBy(features, f => Object.keys(f));
              const is_grouped = grouped && Object.keys(grouped).length > 1;
              const is_multi   = features && is_grouped;

              // Handle WMS Multi Layers Response From QGIS SERVER
              // check if features have different fields (multilayers)
              // is a multilayers. Each feature has different fields
              // If group has more than one feature split it and create single features
              json.FeatureCollection.featureMember = is_multi
                ? Object.keys(grouped).reduce((result, key, i) => {
                  grouped[key].forEach((feat, j) => result[`layer${i}_${j}`] = feat);
                  return result;
                }, { __prefix: prefix })
                : fname.filter(feature => !Array.isArray(feature[name]));

              // Remove Z values due a incorrect addition when using
              // ol.format.WMSGetFeatureInfo readFeatures method from XML
              // (eg. WMS getFeatureInfo);
              if (layer.isGeoLayer() && !is3DGeometry(layer.getGeometryType())) {
                olfeatures.forEach(f => removeZValueToOLFeatureGeometry({ feature: f }));
              }

              /** @FIXME add description */
              []
                .concat(is_multi ? Object.values(grouped) : layer)
                .forEach(g => parsed.unshift({ layer, features: olfeatures }));

              // on each element add and object contain layer name and information, and __prefix 
              if (features && !is_grouped) {
                features.forEach(f => { json.FeatureCollection.featureMember.push({ [name]: f, __prefix: prefix }); });
              }

            });

          return parsed;
        };

      default:
        return function({
          layers = [],
        } = {}) {
          return layers.map(layer => ({
            layer,
            rawdata: t('warning.not_supported_format')
          }))
        };

    }
  },
};

/**
 * ORIGINAL SOURCE: src/app/core/errors/parser/servererrorparser.js@3.9.1
 */
function _traverseErrorMessage(errorObject, error_message = "server_saver_error") {
  try {
    const entries   = Object.entries(errorObject);
    const entry     = entries.find(([key, value]) => key === 'fields');
    const [, value] = (entry || entries[0]);

    /** @FIXME add description */
    if (!entry && !Array.isArray(value) && 'object' === typeof value) {
      return _traverseErrorMessage(value, error_message)
    }

    /** @FIXME add description */
    if (entry && 'string' === typeof value) {
      error_message = `[${ entries.find(([key]) => 'fields' !== key)[0] }] ${value}`;
    }

    /** @FIXME add description */
    if (entry && 'string' !== typeof value) {
      error_message = Object.entries(value).reduce((message, [field, error]) => `${message}${field} ${ Array.isArray(error) ? error[0] : error }\n`, '');
    }

    /** @FIXME add description */
    if (entry) {
      return error_message.replace(/\:|\./g, '');
    }

  } catch(err){
    console.warn(err);
  }
}