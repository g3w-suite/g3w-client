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

  /** @FIXME add description  */
  if (!layers.length) {
    d.resolve([]);
  }

  /** @FIXME add description  */
  if (multilayers) {
    const multiLayers    = groupBy(layers, layer => `${layer.getMultiLayerId()}_${layer.getProjection().getCode()}`);
    const numberRequestd = Object.keys(multiLayers).length;
    let layersLength     = numberRequestd;

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
        .fail(error => queryErrors.push(error))
        .always(() => {
          layersLength -= 1;
          if (0 === layersLength) {
            queryErrors.length === numberRequestd ? d.reject(queryErrors) : d.resolve(queryResponses)
          }
        });
    }
  }
  
  /** @FIXME add description  */
  if (!multilayers && layers.length) {
    let layersLenght = layers.length;
    layers.forEach(layer => {
      const layerCrs = layer.getProjection().getCode();
      // Convert filter geometry from `mapCRS` to `layerCrs`
      filter.setGeometry((mapCrs === layerCrs) ? geometry : geometry.clone().transform(mapCrs, layerCrs));
      layer
        .query({ filter, filterConfig, feature_count })
        .then(response => queryResponses.push(response))
        .fail(error => queryErrors.push(error))
        .always(() => {
          layersLenght -= 1;
          if (0 === layersLenght) {
            queryErrors.length === layers.length ? d.reject(queryErrors) : d.resolve(queryResponses)
          }
        })
    });
  }

  return d.promise();
};