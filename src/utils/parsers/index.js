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

const { t }                                = require('g3w-i18n');

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
          filtertoken, //@since 3.11.0
        } = {}) {
          const layersFeatures = layers.map(layer => ({ layer, features: [], filtertoken }));
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

          /**
           * convert XML string response to JSON
           * 
           * Based on: https://github.com/abdolence/x2js/tree/v1.2.0
           */
          const x2js = new (class {

            getNodeName(node) {
              return node.localName || node.baseName || node.nodeName;
            }

            escapeXmlChars(str) {
              return "string" == typeof str
                ? str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;")
                : str;
            }

            startTag(json, element, attrs, closed) {
              let res = "<" + (null != json && null != json.__prefix ? json.__prefix + ":" : "") + element;
              for (let i = 0; i < (attrs || []).length; i++) {
                json[attrs[i]] = this.escapeXmlChars(json[attrs[i]]);
                res += ` ${ attrs[i].substr(1) }='${ json[attrs[i]] }'`;
              }
              return res += closed ? "/>" : ">"
            }
          
            endTag(json, tagName) {
              return "</" + (null != json.__prefix ? json.__prefix + ":" : "") + tagName + ">"
            }

            jsonXmlSpecialElem(json, field) {
              return !!(0 == field.toString().indexOf('_') || 0 == field.toString().indexOf("__") || json[field] instanceof Function)
            }
          
            jsonXmlElemCount(json) {
              let i = 0;
              if (json instanceof Object)
                for (let k in json) this.jsonXmlSpecialElem(json, k) || i++;
              return i
            }

            parseJSONAttrs(json) {
              const n = [];
              if (json instanceof Object) {
                for (let k in json) {
                  if (-1 == k.toString().indexOf("__") && 0 == k.toString().indexOf('_')) {
                    n.push(k);
                  }
                }
              }
              return n
            }
          
            parseJSONText(json) {
              let res = "";
              if (json instanceof Object && null != json.__cdata) {
                res += "<![CDATA[" + json.__cdata + "]]>";
              }
              if (json instanceof Object && null != json.__text) {
                res += this.escapeXmlChars(json.__text);
              }
              if (!(json instanceof Object) && null != json) {
                res += this.escapeXmlChars(json);
              }
              return res;
            }

            parse(node, path) {
              // ROOT node
              if (node.nodeType == Node.DOCUMENT_NODE) {
                let res = {};
                for (let i = 0; i < node.childNodes.length; i++) {
                  let child = node.childNodes.item(i);
                  if (child.nodeType == Node.ELEMENT_NODE) {
                    res[this.getNodeName(child)] = this.parse(child, this.getNodeName(child))
                  }
                }
                return res;
              }

              // HTML node
              if (node.nodeType == Node.ELEMENT_NODE) {
                let res = { __cnt: 0 };
                for (let i = 0; i < node.childNodes.length; i++) {
                  let child = node.childNodes.item(i);
                  if (child.nodeType == Node.COMMENT_NODE) {
                    continue;
                  }
                  res.__cnt++;
                  if (null == res[this.getNodeName(child)]) {
                    res[this.getNodeName(child)] = this.parse(child, path + "." + this.getNodeName(child));
                  } else {
                    (res[this.getNodeName(child)] instanceof Array || (res[this.getNodeName(child)] = [res[this.getNodeName(child)]]));
                    res[this.getNodeName(child)][res[this.getNodeName(child)].length] = this.parse(child, path + "." + this.getNodeName(child));
                  }
                }
                for (let i = 0; i < node.attributes.length; i++) {
                  res.__cnt++;
                  res['_' + node.attributes.item(i).name] = node.attributes.item(i).value;
                }
                if (![null,''].includes(node.prefix)) {
                  res.__cnt++;
                  res.__prefix = node.prefix;
                }
                if ("#text" in res) {
                  res.__text = res["#text"] instanceof Array ? res["#text"].join("\n") : res["#text"];
                  res.__text = res.__text.trim();
                  delete res["#text"];
                }
                if ("#cdata-section" in res) {
                  res.__cdata = res["#cdata-section"];
                  delete res["#cdata-section"];
                }
                if (0 == res.__cnt) {
                  res = "";
                }
                if (!res.__text) {
                  delete res.__text;
                }
                if (res.__text) {
                  res.toString = () => (null != res.__text ? res.__text : "") + (null != res.__cdata ? res.__cdata : "");
                }
                delete res.__cnt;
                return res;
              }

              // TEXT node
              if (node.nodeType == Node.TEXT_NODE || node.nodeType == Node.CDATA_SECTION_NODE) {
                return node.nodeValue;
              }
            }
          
            parseJSON(json, path) {
              let res = "";
              if (this.jsonXmlElemCount(json) > 0) {
                for (let k in json) {

                  if (-1 === ["_fid", "__prefix"].indexOf(k) && !k.match(/xmlns:|xsi:/) && this.jsonXmlSpecialElem(json, k)) {
                    const i = k.replace(/^_+/, "");
                    json[i] = json[k];
                    k = i
                  }

                  if (this.jsonXmlSpecialElem(json, k)) {
                    continue;
                  }

                  let attrs = this.parseJSONAttrs(json[k]);
                  
                  if ([null, undefined].includes(json[k]) || (json[k] instanceof Array && 0 == json[k].length)) {
                    res += this.startTag(json[k], k, attrs, true);
                  }

                  else if (json[k] instanceof Array && json[k].length > 0) {
                    res += json[k].map(d => (this.startTag(d, k, this.parseJSONAttrs(d), false) + this.parseJSON(d, "" === path ? k : path + "." + k) + this.endTag(d, k))).join('');
                  }
                  
                  else if (json[k] instanceof Date) {
                    res += this.startTag(json[k], k, attrs, false) + json[k].toISOString() + this.endTag(json[k], k);
                  }

                  else if (json[k] instanceof Object) {
                    if (attrs.length && -1 !== attrs.indexOf("_fid")) {
                      attrs = ["_fid"];
                    }
                    const o = this.jsonXmlElemCount(json[k]);
                    if (o > 0 || null != json[k].__text || null != json[k].__cdata) {
                      res += this.startTag(json[k], k, attrs, false) + this.parseJSON(json[k], "" === path ? k : path + "." + k) + this.endTag(json[k], k);
                    } else {
                      res += startTag(json[k], k, attrs, true);
                    }
                  }

                  else {
                    res += this.startTag(json[k], k, attrs, false) + this.parseJSONText(json[k]) + this.endTag(json[k], k);
                  }
                }
              }
              return res += this.parseJSONText(json)
            }
          });
          
          let json;

          try {
            json = x2js.parse((new DOMParser).parseFromString(response, "text/xml"));
          } catch (e) {
            console.warn(e);
          }

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
          layers.forEach((layer, i) => {
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
            const xml        = x2js.parseJSON(json, ''); // layer Feature Collection XML
            const olfeatures = (new ol.format.WMSGetFeatureInfo()).readFeatures(xml);

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