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
  const d = $.Deferred();

  /** @FIXME add description */
  if (!layers.length) {
    return d.resolve(layers);
  }

  const map            = GUI.getComponent('map').getService().getMap();
  const size           = map.getSize();
  const queryResponses = [];
  const queryErrors    = [];
  const mapProjection  = map.getView().getProjection();
  const resolution     = map.getView().getResolution();

  // multilayers request
  if (multilayers) {
    const multiLayers = {};
    layers.forEach(layer => {
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
      const _multilayer = multiLayers[key];
      const layers      = _multilayer;
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
        .fail(error => queryErrors.push(error))
        .always(() => {
          layersLength -= 1;
          if (0 === layersLength) {
            queryErrors.length === numberOfRequests ? d.reject(queryErrors) : d.resolve(queryResponses);
          }
        })
    }
    return d.promise();
  }
  
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
        .fail(error => { queryErrors.push(error); rejectedResponses +=1; })
        .always(() => {
          layersLength -= 1;
          if (0 === layersLength) {
            rejectedResponses < layers.length ? d.resolve(queryResponses) : d.reject(queryErrors)
          }
        });
    });

  return d.promise();
};