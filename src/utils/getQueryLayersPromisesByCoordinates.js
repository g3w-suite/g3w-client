import { QUERY_POINT_TOLERANCE } from 'app/constant';
import GUI                       from 'services/gui';

/**
 * @param layers 
 * @param { Object } opts
 * @param opts.coordinates
 * @param opts.feature_count
 * @param opts.query_point_tolerance
 * @param opts.multiLayers
 * @param opts.reproject
 *  
 * @returns { JQuery.Promise }
 */
export function getQueryLayersPromisesByCoordinates(layers, { coordinates, feature_count = 10, query_point_tolerance = QUERY_POINT_TOLERANCE, multilayers = false, reproject = true } = {}) {
  
  // no layers
  if (0 === layers.length) {
    return Promise.resolve(layers);
  }

  const map            = GUI.getService('map').getMap();
  const size           = map.getSize();
  const qres           = []; // query responses
  const qerr           = []; // query errors
  const mapProjection  = map.getView().getProjection();
  const resolution     = map.getView().getResolution();

  return new Promise((resolve, reject) => {
    // multilayers request
    if (multilayers) {
      const multi = {}; // multi layers
      layers
        .forEach(layer => {
          const key = `${layer.getInfoFormat()}:${layer.getInfoUrl()}:${layer.getMultiLayerId()}`;
          if (multi[key]) {
            multi[key].push(layer);
          } else {
            multi[key] = [layer];
        }
        });
      const num = Object.keys(multi).length; // number of requests
      let len   = num;
      for (let key in multi) {
        const provider = multi[key][0].getProvider('query');
        provider
          .query({
            feature_count,
            coordinates,
            query_point_tolerance,
            mapProjection,
            reproject,
            resolution,
            size,
            layers: multi[key],
          })
          .then(d => qres.push(d))
          .catch(e => qerr.push(e))
          .finally(() => {
            len -= 1;
            if (0 === len) {
              (qerr.length === num) ? reject(qerr) : resolve(qres);
            }
          })
      }
    } else {
      let len = layers.length; // single layers request
      let rej = 0;             // rejected responses
      layers
        .forEach(layer => {
          layer
            .query({
              feature_count,
              coordinates,
              query_point_tolerance,
              mapProjection,
              size,
              resolution,
            })
            .then(d => qres.push(d))
            .catch(e => { qerr.push(e); rej +=1; })
            .finally(() => {
              len -= 1;
              if (0 === len) {
                (rej < layers.length) ? resolve(qres) : reject(qerr);
              }
            });
        });
    }
  });
}