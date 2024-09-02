import { groupBy }     from 'utils/groupBy';
import { $promisify  } from 'utils/promisify';


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
export function getQueryLayersPromisesByGeometry(layers,
  {
    geometry,
    projection,
    filterConfig  = {},
    multilayers   = false,
    feature_count = 10
  } = {}
) {
  const queryResponses = [];
  const queryErrors    = [];
  const mapCrs         = projection.getCode();
  const filter         = new Filter(filterConfig);

  /** In case of no features  */
  if (0 === layers.length) {
    return $promisify(Promise.resolve([]));
  }

  return $promisify(new Promise((resolve, reject) => {

    /** Group query by layers instead single layer request  */
    if (multilayers) {
      const multiLayers = groupBy(layers, l => `${l.getMultiLayerId()}_${l.getProjection().getCode()}`);
      let i             = Object.keys(multiLayers).length;

      for (let key in multiLayers) {
        const layerCrs = multiLayers[key][0].getProjection().getCode();
        // Convert filter geometry from `mapCRS` to `layerCrs`
        filter.setGeometry(mapCrs === layerCrs ? geometry : geometry.clone().transform(mapCrs, layerCrs));
        multiLayers[key][0]
          .getProvider('filter')
          .query({ filter, layers: multiLayers[key], feature_count })
          .then(response => queryResponses.push(response))
          .fail(e => { console.warn(e); queryErrors.push(e) })
          .always(() => {
            i -= 1;
            if (0 === i) {
              queryErrors.length === Object.keys(multiLayers).length
                ? reject(queryErrors)
                : resolve(queryResponses)
            }
          });
      }
    } else {

      let i = layers.length;
      layers.forEach(layer => {
        const layerCrs = layer.getProjection().getCode();
        // Convert filter geometry from `mapCRS` to `layerCrs`
        filter.setGeometry((mapCrs === layerCrs) ? geometry : geometry.clone().transform(mapCrs, layerCrs));
        layer
          .query({ filter, filterConfig, feature_count })
          .then(response => queryResponses.push(response))
          .fail(e => { console.warn(e); queryErrors.push(e); })
          .always(() => {
            i -= 1;
            if (0 === i) {
              (queryErrors.length === layers.length)
                ? reject(queryErrors)
                : resolve(queryResponses)
            }
          })
      });
    }
  }))
}