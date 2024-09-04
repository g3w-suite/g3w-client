import { QUERY_POINT_TOLERANCE } from 'app/constant';
import GUI                       from 'services/gui';
import { $promisify, promisify } from 'utils/promisify';

/**
 * @param layers 
 * @param { Object } opts
 * @param opts.coordinates
 * @param opts.feature_count
 * @param opts.query_point_tolerance
 * @param { boolean } opts.multilayers Group query by layers instead single layer request
 * @param opts.reproject
 *  
 * @returns { JQuery.Promise }
 */
export function getQueryLayersPromisesByCoordinates(layers, {
  coordinates,
  feature_count         = 10,
  query_point_tolerance = QUERY_POINT_TOLERANCE,
  multilayers           = false,
  reproject             = true,
} = {}) {

  // skip when no features
  if (0 === layers.length) {
    return $promisify(Promise.resolve(layers));
  }

  return $promisify(new Promise((resolve, reject) => {

    const map            = GUI.getService('map').getMap();
    const size           = map.getSize();
    const queryResponses = [];
    const queryErrors    = [];
    const mapProjection  = map.getView().getProjection();
    const resolution     = map.getView().getResolution();

    console.log(multilayers);

    Object.values(
      multilayers
        ? groupBy(layers, l => `${l.getInfoFormat()}:${l.getInfoUrl()}:${l.getMultiLayerId()}`)
        : layers
    ).forEach(async (layers, i, arr) => {
      try {
        const layer = multilayers ? layers[0] : layers;
        queryResponses.push(await promisify(
          multilayers
            ? layer.getProvider('query').query({ feature_count, coordinates, query_point_tolerance, mapProjection, size, resolution, reproject, layers })
            : layer                     .query({ feature_count, coordinates, query_point_tolerance, mapProjection, size, resolution })
        ))
      } catch (e) {
        console.warn(e);
        queryErrors.push(e)
      }
      if (i === arr.length - 1) {
        if (queryErrors.length === arr.length) {
          reject(queryErrors);
        } else {
          resolve(queryResponses);
        }
      }
    });

  }))

}