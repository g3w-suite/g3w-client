/**
 * @file
 * 
 * ORIGINAL SOURCE: src/app/core/utils/parsers.js@3.8
 * ORIGINAL SOURCE: src/app/core/errors/parser/servererrorparser.js@3.9.1
 * 
 * @since 3.9.0
 */

import { G3W_FID }            from 'g3w-constants';
import GUI                    from 'services/gui';
import { groupBy }            from 'utils/groupBy';
import { is3DGeometry }       from 'utils/is3DGeometry';
import { removeZValue }       from 'utils/removeZValue';
import { sanitizeFidFeature } from 'utils/sanitizeFidFeature'
import { reverseGeometry }    from 'utils/reverseGeometry';
import { Feature }            from 'map/layers/feature';
import { t }                  from 'g3w-i18n';

Object
  .entries({
    G3W_FID,
    GUI,
    Feature,
    t,
    is3DGeometry,
    removeZValue,
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
            }))
            .readFeatures('string' === typeof data ? JSON.parse(data) : data)
            .map(f => { f.set(G3W_FID, f.getId()); return f; }); //set g3w_fid to have G3W_FID property
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

          // numeric value (integer or float)
          if (invalids) {
            response = invalids.reduce((acc, find) => acc.replace(new RegExp(find[0], 'g'), `qgs:${NUMERIC_FIELD}${find[1]}${find[2]}`), response);
          }

          // HOTFIX: null characther ("\u0000")
          if (response) {
            response = response.replace(new RegExp(String.fromCharCode(0), 'g'), '0');
          }

          const parsed = []; //Array contains item object ({layer, features})
          let xml;

          try {
            xml = (new DOMParser).parseFromString(response, "text/xml");

            // skip when response has no features
            if (!xml.querySelector('FeatureCollection > featureMember')) {
              throw 'no features in response';
            }

            layers.forEach((layer, i) => {

              const cloned = xml.cloneNode(true);
              let feats = [];

              // get layers by name (eg. "qgs:layer0")
              const qgs = [...cloned.querySelectorAll(`FeatureCollection > featureMember > layer${i}`)];

              // set "g3w_fid" attribute from `fid="<layer_name_or_id.fid>"`
              qgs.forEach(feat => {
                const fid = (feat.getAttribute('fid') || '.').split('.')[1];
                if (fid) {
                  const g3w_fid = cloned.createElement('gml:' + G3W_FID);
                  feat.setAttribute('fid', fid);
                  g3w_fid.textContent = fid;
                  feat.appendChild(g3w_fid);
                }
                feats.push(feat.parentNode);
              });

              // get multi layers wms (eg. "layer0" → "layer0_0" + "layer1_0")
              if (qgs.length > 1) {
                const grouped = groupBy(qgs, feat => Object.values(feat.children).map(d => d.nodeName));
                if (Object.keys(grouped).length > 1) {
                  Object.keys(grouped).forEach((key, i) => grouped[key].forEach((node, j) => {
                    // see: https://andreiglingeanu.me/rename-element-tag/
                    const renamed = cloned.createElement(`qgs:layer${i}_${j}`);
                    [...node.attributes].map(({ name, value }) => { renamed.setAttribute(name, value); });
                    while (node.firstChild) { renamed.appendChild(node.firstChild); }
                    const feat = cloned.createElement('gml:featureMember');
                    feat.appendChild(renamed);
                    node.parentNode.insertAdjacentElement('beforebegin', feat);
                    if (1 === node.parentNode.children.length) {
                      node.parentNode.parentNode.removeChild(node.parentNode);
                    } else {
                      node.parentNode.removeChild(node);
                    }
                    feats.push(feat);
                  }));
                }
              }

              // keep only current layer features
              cloned.querySelectorAll('FeatureCollection > featureMember').forEach(node => {
                if (!feats.includes(node)) {
                  node.parentNode.removeChild(node);
                }
              });

              feats = (new ol.format.WMSGetFeatureInfo()).readFeatures(cloned.documentElement.outerHTML);

              // whether need to re-project features
              const is_reprojected = projections.layer && projections.layer.getCode() !== projections.map.getCode() && feats.length && !!feats[0].getGeometry();
  
              /** @FIXME add description */
              if (feats.length && invalids) {
                const fields = Object.keys(feats[0].getProperties()).filter(p => -1 !== p.indexOf(NUMERIC_FIELD));
                feats.forEach(f => {
                  fields.forEach(_field => {
                    const invalid = invalids.find(find => `${find[1]}${find[2]}` === _field.replace(NUMERIC_FIELD, ''));
                    f.set(invalid[0].replace('qgs:', ''), [].concat(f.get(_field))[0]);
                    f.unset(_field);
                  })
                });
              }
  
              // transform features
              if (is_reprojected) {
                feats.forEach(f => f.setGeometry(f.getGeometry().transform(projections.layer.getCode(), projections.map.getCode())));
              }
  
              // inverted axis --> reverse features coordinates
              if ('ne' === (projections.layer || projections.map).getAxisOrientation().substr(0, 2)) {
                feats.forEach(f => f.setGeometry(reverseGeometry(f.getGeometry())));
              }
  
              // remove Z values added by "ol.format.WMSGetFeatureInfo" readFeatures
              if (layer.isGeoLayer() && !is3DGeometry(layer.getGeometryType())) {
                feats.forEach(f => removeZValue({ feature: f }));
              }

              parsed.unshift({ layer, features: feats });

            });
          } catch (e) {
            console.warn(e);
          }

          /** @since 3.9.1 handle server errors */
          if (xml.querySelector('ServiceException')) {
            GUI.showUserMessage({
              type:        'warning',
              textMessage: true,
              message:     `${layers[0].getName()} - ${xml.querySelector('ServiceException').innerText}`
            })
          }

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