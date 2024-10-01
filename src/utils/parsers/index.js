/**
 * @file
 * 
 * ORIGINAL SOURCE: src/app/core/utils/parsers.js@3.8
 * ORIGINAL SOURCE: src/app/core/errors/parser/servererrorparser.js@3.9.1
 * 
 * @since 3.9.0
 */

import { G3W_FID }                         from 'g3w-constants';
import GUI                                 from 'services/gui';
import { groupBy }                         from 'utils/groupBy';
import { is3DGeometry }                    from 'utils/is3DGeometry';
import { removeZValueToOLFeatureGeometry } from 'utils/removeZValueToOLFeatureGeometry';
import { sanitizeFidFeature }              from 'utils/sanitizeFidFeature'
import { reverseGeometry }                 from 'utils/reverseGeometry';
import { Feature }                         from 'map/layers/feature';
import { t }                               from 'g3w-i18n';

Object
  .entries({
    G3W_FID,
    GUI,
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
        return function(opts = {}) {
          let { error } = opts;
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
          return (data.features || [])
            .map(f => {
              const feature = new Feature();
              feature.setProperties(f.properties);
              feature.setId(f.id);
              return feature;
            });
        };

      case 'g3w-vector/gml':
        return function({ data, layer } = {}) {
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
          } catch(e) {
            console.warn(e);
            return [];
          }
        };

      case 'g3w-vector/geojson':
      case 'g3w-vector/json':
        return function(data, options) {
          try {
            return (new ol.format.GeoJSON({
              geometryName:      'geometry',
              dataProjection:    options.crs,
              featureProjection: options.mapCrs || options.crs,
            })).readFeatures('string' === typeof data ? JSON.parse(data) : data);
          } catch (e) {
            console.warn(e);
            return [];
          }
        };

      case 'application/json':
        return function({
          response,
          projections,
          layers = [],
          wms = true,
        } = {}) {
          const layersFeatures = layers.map(layer => ({ layer, features: [] }));
          const layersId       = layers.map(l => wms ? l.getWMSLayerName() : l.getWFSLayerName());
          // features
          (
            response
              ? (new ol.format.GeoJSON({
                  geometryName:          'geometry',
                  defaultDataProjection: projections.layer || projections.map,
                })).readFeatures(response)
              : []
          ).filter(feature => {
            const featureId = feature.getId();
            const g3w_fid   = sanitizeFidFeature(featureId);
            // in the case of wms getfeature without a filter return string contain layerName or layerid
            const index = featureId == g3w_fid ? 0 : layersId.indexOf(featureId);
            // skip when ..
            if (-1 === index) {
              return false;
            }
            const props = feature.getProperties();
            feature.set(G3W_FID, g3w_fid);
            // fields
            layersFeatures[index]
              .layer
              .getFields()
              .filter(f => f.show && undefined === props[f.name] && undefined !== props[f.label])
              .forEach(f => feature.set(f.name, props[f.label]));
            // features
            layersFeatures[index].features.push(feature);
          });
          return layersFeatures;
        };

      case 'application/geojson':
        return function({
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
        return function({
          layers,
          response,
        } = {}) {
          return layers.map(layer => ({
            layer,
            rawdata: response,
          }));
        };

      case 'text/gml':
        return function({
          layers,
          response,
        }) {
          return layers.map(layer => ({
            layer,
            features: ResponseParser.get('g3w-vector/gml')({ data: response, layer: layers[0] })
          }));
        };

      case 'application/vnd.ogc.gml':
        return function({
          response,
          projections,
          layers,
          wms = true,
          id =  false,
        } = {}) {
          // convert XML response to string
          if (response && 'string' !== typeof response && !(response instanceof String)) {
            response = new XMLSerializer().serializeToString(response);
          }

          // sanitize layer name (removes: whitespaces, quotes, parenthesis, slashes)
          if (response) {
            response = layers.reduce((acc, layer, i) => {
              let id = (wms && layer.isWmsUseLayerIds() ? layer.getId() : layer.getName()).replace(/[\s'()/]+/g, s => /\s/g.test(s) && !wms ? '_' : '');
              if (!wms) {
                id = id.replace(/[/\\]+/g, '').replaceAll(':', '-');
              }
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

          // in the case of parser return null
          if (!json) {
            return [{
              layer:    layers[0],
              features: [],
            }];
          }

          /** @since 3.9.1 ServiceExceptionReport is a json attribute returned by server in case of error */
          if (json.ServiceExceptionReport && json.ServiceExceptionReport.ServiceException) {
            GUI.showUserMessage({
              type:        'warning',
              textMessage: true,
              message:     `${layers[0].getName()} - ${json.ServiceExceptionReport.ServiceException}`
            })
          }

          // skip when json response hasn't FeatureCollection array (no features)
          if (!json.FeatureCollection || !json.FeatureCollection.featureMember) {
            return [];
          }

          // handled responses
          const parsed = []; //Array contains item object ({layer, features})
          const originalFeatureMember = [].concat(json.FeatureCollection.featureMember);
          //Loop on each layer
          layers.forEach((layer, i/*, originalFeatureMember*/) => {
            const name = id ? layer.getId() : `layer${i}`; // layer name

            json.FeatureCollection.featureMember = originalFeatureMember
              .filter(f => f[name])
              .map(f => {
                const fm = f[name];
                const prefix = f.__prefix;
                //set fid of each feature
                [].concat(fm).forEach(_fm => {
                  //need to get fid number removing <layer_name_or_id.fid>
                  _fm._fid = _fm._fid && _fm._fid.split('.')[1];
                  _fm[G3W_FID] = {
                    __prefix: prefix,
                    __text:   _fm._fid
                  }
                })
                //in case of wms multi layer
                if (Array.isArray(fm)) {
                  const grouped = groupBy(fm, f => Object.keys(f));
                  // check if features have the same fields. If not, group the features with the same fields
                  //check if features have different fields (multilayers)
                  // If its is a multilayers. Each feature has different fields
                  return Object.keys(grouped).length > 1
                    ? Object.keys(grouped)
                       .map((key, index) => grouped[key].map((feature, sub_index) => ({ [`layer${index}_${sub_index}`]: feature, __prefix: prefix }) )).flat()
                    : //for Each element have to add and object contain layerName and information, and __prefix
                    fm.map(f => ({ [name]:   f,  __prefix: prefix }) );
                } else {
                  return f;
                }

              }).flat();
            // parse layer feature collection
            const xml            = x2js.json2xml_str(json); // layer Feature Collection XML
            const olfeatures     = (new ol.format.WMSGetFeatureInfo()).readFeatures(xml);

            //Check if you need to re-project features because layers are in different projection of the map
            const is_reprojected = (
              olfeatures.length > 0  //has features
              && !!olfeatures[0].getGeometry()  // has a geometry
              && projections.layer //has a layer projection
              && projections.layer.getCode() !== projections.map.getCode() //the layer has the same projection of the map
            );

            /** @FIXME add description */
            if (olfeatures.length > 0 && invalids) {
              const fields = Object.keys(olfeatures[0].getProperties()).filter(p => -1 !== p.indexOf(NUMERIC_FIELD));
              olfeatures.forEach(f => {
                fields.forEach(_field => {
                  const invalid = invalids.find(find => `${find[1]}${find[2]}` === _field.replace(NUMERIC_FIELD, ''));
                  f.set(invalid[0].replace('qgs:', ''), [].concat(f.get(_field))[0]);
                  f.unset(_field);
                })
              });
            }

            // transform features
            if (is_reprojected) {
              olfeatures.forEach(f => f.setGeometry(f.getGeometry().transform(projections.layer.getCode(), projections.map.getCode())));
            }

            // inverted axis --> reverse features coordinates
            if (is_reprojected && 'ne' === (projections.layer ? projections.layer : projections.map).getAxisOrientation().substr(0, 2)) {
              olfeatures.forEach(f => f.setGeometry(reverseGeometry(f.getGeometry())));
            }

            // Remove Z values due an incorrect addition when using
            // ol.format.WMSGetFeatureInfo readFeatures method from XML
            // (ex. WMS getFeatureInfo);
            if (layer.isGeoLayer() && !is3DGeometry(layer.getGeometryType())) {
              olfeatures.forEach(f => removeZValueToOLFeatureGeometry({ feature: f }));
            }

            parsed.unshift({ layer, features: olfeatures });

          })

          return parsed;
        };

      default:
        return function({
          layers = [],
        } = {}) {
          return layers.map(layer => ({ layer, rawdata: t('warning.not_supported_format') }))
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
    const entry     = entries.find(([key, _]) => 'fields' === key);
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

  } catch(e) {
    console.warn(e);
  }
}