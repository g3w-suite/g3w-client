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
  const d              = $.Deferred();
  const queryResponses = [];
  const queryErrors    = [];
  const mapCrs         = projection.getCode();
  const filter         = new Filter(filterConfig);

  /** In case of no features  */
  if (0 === layers.length) {
    d.resolve([]);
  }

  /** Group query by layers instead single layer request  */
  if (multilayers) {
    const multiLayers     = groupBy(layers, layer => `${layer.getMultiLayerId()}_${layer.getProjection().getCode()}`);
    const numberRequested = Object.keys(multiLayers).length;
    let layersLength      = numberRequested;

    for (let key in multiLayers) {
      const _multilayer = multiLayers[key];
      const layers      = _multilayer;
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
              ? d.reject(queryErrors)
              : d.resolve(queryResponses)
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
        .fail(error => queryErrors.push(error))
        .always(() => {
          layersLenght -= 1;
          if (0 === layersLenght) {
            (queryErrors.length === layers.length)
              ? d.reject(queryErrors)
              : d.resolve(queryResponses)
          }
        })
    });
  }

  return d.promise();
}