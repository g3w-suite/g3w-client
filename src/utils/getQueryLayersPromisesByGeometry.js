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
  return $promisify(new Promise((resolve, reject) => {
    const queryResponses = [];
    const queryErrors    = [];
    const mapCrs         = projection.getCode();
    const filter         = new Filter(filterConfig);

    /** In case of no features  */
    if (0 === layers.length) {
      resolve([]);
    }

    /** Group query by layers instead single layer request  */
    if (multilayers) {
      const multiLayers     = groupBy(layers, layer => `${layer.getMultiLayerId()}_${layer.getProjection().getCode()}`);
      const numberRequested = Object.keys(multiLayers).length;
      let layersLength      = numberRequested;

      for (let key in multiLayers) {
        const layers      = multiLayers[key];
        const multilayer  = multiLayers[key][0];
        const provider    = multilayer.getProvider('filter');
        const layerCrs    = multilayer.getProjection().getCode();
        // Convert filter geometry from `mapCRS` to `layerCrs`
        filter.setGeometry(mapCrs === layerCrs ? geometry : geometry.clone().transform(mapCrs, layerCrs));
        provider
          .query({ filter, layers, feature_count })
          .then(response => queryResponses.push(response))
          .fail(e => { console.warn(e); queryErrors.push(e) })
          .always(() => {
            layersLength -= 1;
            if (0 === layersLength) {
              queryErrors.length === numberRequested
                ? reject(queryErrors)
                : resolve(queryResponses)
            }
          });
      }
    } else {

      let layersLenght = layers.length;
      layers.forEach(layer => {
        const layerCrs = layer.getProjection().getCode();
        // Convert filter geometry from `mapCRS` to `layerCrs`
        filter.setGeometry(
          (mapCrs === layerCrs)
            ? geometry
            : geometry.clone().transform(mapCrs, layerCrs)
        );
        layer
          .query({ filter, filterConfig, feature_count })
          .then(response => queryResponses.push(response))
          .fail(e => { console.warn(e); queryErrors.push(e); })
          .always(() => {
            layersLenght -= 1;
            if (0 === layersLenght) {
              (queryErrors.length === layers.length)
                ? reject(queryErrors)
                : resolve(queryResponses)
            }
          })
      });
    }
  }))
}