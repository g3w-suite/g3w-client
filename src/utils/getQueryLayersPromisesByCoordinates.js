import { QUERY_POINT_TOLERANCE } from 'app/constant';
import GUI                       from 'services/gui';
import { $promisify }            from 'utils/promisify';

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
  return $promisify(new Promise((resolve, reject) => {
    /** If no layers*/
    if (0 === layers.length) {
      return resolve(layers);
    }

    const map            = GUI.getService('map').getMap();
    const size           = map.getSize();
    const queryResponses = [];
    const queryErrors    = [];
    const mapProjection  = map.getView().getProjection();
    const resolution     = map.getView().getResolution();

    // multilayers request
    if (multilayers) {
      const multiLayers = {};
      layers
        .forEach(layer => {
          const key = `${layer.getInfoFormat()}:${layer.getInfoUrl()}:${layer.getMultiLayerId()}`;
          if (multiLayers[key]) {
            multiLayers[key].push(layer);
          } else {
            multiLayers[key] = [layer];
          }
        });
      const numberOfRequests = Object.keys(multiLayers).length;
      let layersLength = numberOfRequests;
      for (let key in multiLayers) {
        const layers      = multiLayers[key];
        const multilayer  = multiLayers[key][0];
        const provider    = multilayer.getProvider('query');
        provider
          .query({
            feature_count,
            coordinates,
            query_point_tolerance,
            mapProjection,
            reproject,
            resolution,
            size,
            layers,
          })
          .then(response => queryResponses.push(response))
          .fail(e => { console.warn(e); queryErrors.push(e) })
          .always(() => {
            layersLength -= 1;
            if (0 === layersLength) {
              (queryErrors.length === numberOfRequests)
                ? reject(queryErrors)
                : resolve(queryResponses);
            }
          })
      }
    } else {
      // single layers request
      let layersLength      = layers.length;
      let rejectedResponses = 0;
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
            .then(response => queryResponses.push(response))
            .fail(e => { console.warn(e); queryErrors.push(e); rejectedResponses +=1; })
            .always(() => {
              layersLength -= 1;
              if (0 === layersLength) {
                (rejectedResponses < layers.length)
                  ? resolve(queryResponses)
                  : reject(queryErrors);
              }
            });
        });
    }
  }))

}