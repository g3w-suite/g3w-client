import { groupBy } from 'utils/groupBy';

const Filter = require('core/layers/filter/filter');

/**
 * @param layers
 * @param { Object } opts
 * @param opts.multilayers
 * @param opts.bbox
 * @param opts.geometry
 * @param opts.projection
 * @param opts.feature_count
 * 
 * @returns { JQuery.Promise<any, any, any> }
 */
export function getQueryLayersPromisesByGeometry(layers, { multilayers = false, geometry, filterConfig = {}, projection, feature_count = 10 } ={}) {
  const qres   = []; // query responses
  const qerr   = []; // query errors
  const mapCrs = projection.getCode();
  const filter = new Filter(filterConfig);

  // no features
  if (0 === layers.length) {
    return Promise.resolve([]);
  }

  return new Promise((resolve, reject) => {
    /** Group query by layers instead single layer request  */
    if (multilayers) {
      const multi = groupBy(layers, layer => `${layer.getMultiLayerId()}_${layer.getProjection().getCode()}`);
      const num   = Object.keys(multi).length; // number of request
      let len     = num;

      for (let key in multi) {
        const provider    = multi[key][0].getProvider('filter');
        const layerCrs    = multi[key][0].getProjection().getCode();
        // Convert filter geometry from `mapCRS` to `layerCrs`
        filter.setGeometry(mapCrs === layerCrs ? geometry : geometry.clone().transform(mapCrs, layerCrs));
        provider
          .query({
            filter,
            layers: multi[key],
            feature_count,
          })
          .then(d => qres.push(d))
          .catch(e => qerr.push(e))
          .finally(() => {
            len -= 1;
            if (0 === len) {
              qerr.length === num ? reject(qerr) : resolve(qres)
            }
          });
      }
    } else {
      let len = layers.length;
      layers.forEach(layer => {
        const layerCrs = layer.getProjection().getCode();
        // Convert filter geometry from `mapCRS` to `layerCrs`
        filter.setGeometry((mapCrs === layerCrs) ? geometry : geometry.clone().transform(mapCrs, layerCrs));
        layer
          .query({ filter, filterConfig, feature_count })
          .then(d => qres.push(d))
          .catch(e => qerr.push(e))
          .finally(() => {
            len -= 1;
            if (0 === len) {
              (qerr.length === layers.length) ? reject(qerr) : resolve(qres)
            }
          })
      });
    }
  });
}