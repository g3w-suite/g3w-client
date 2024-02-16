import GUI                                  from 'services/gui';
import { getQueryLayersPromisesByGeometry } from 'utils/getQueryLayersPromisesByGeometry';

const Filter = require('core/layers/filter/filter');

/**
 * @param layers
 * @param { Object } opts
 * @param opts.bbox
 * @param opts.feature_count
 * @param opts.multilayers
 * 
 * @returns { JQuery.Promise<any, any, any> }
 */
export function getQueryLayersPromisesByBBOX(layers, { bbox, filterConfig = {}, feature_count = 10, multilayers = false }) {
  const geometry      = ol.geom.Polygon.fromExtent(bbox);
  const mapProjection = GUI.getComponent('map').getService().getMap().getView().getProjection();

  /** Group query by layers */
  if (multilayers) {
    return getQueryLayersPromisesByGeometry(layers, {
      geometry,
      feature_count,
      filterConfig,
      multilayers,
      projection: mapProjection,
    })
  }

  const mapCrs         = mapProjection.getCode();
  const queryResponses = [];
  const queryErrors    = [];
  let len              = layers.length;

  return new Promise((resolve, reject) => {
    /** @FIXME add description */
    layers
      .forEach(layer => {
        const filter   = new Filter(filterConfig);
        const layerCrs = layer.getProjection().getCode();
        // Convert filter geometry from `mapCRS` to `layerCrs`
        filter.setGeometry(mapCrs === layerCrs ? geometry : geometry.clone().transform(mapCrs, layerCrs));

        layer
          .query({ filter, feature_count })
          .then(d => queryResponses.push(d))
          .catch(e => queryErrors.push(e))
          .finally(() => {
            len -= 1;
            if (0 === len) {
              queryErrors.length === layers.length ? reject(queryErrors) : resolve(queryResponses);
            }
        })
      });
  });
}