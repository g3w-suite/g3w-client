/**
 * @file
 * @since v3.6
 */
import { createOlFeatureFromApiResponseFeature } from 'utils/createOlFeatureFromApiResponseFeature';

const { base, inherit }                         = require('utils');
const BaseService                               = require('core/data/service');

function SearchService() {

  base(this);

  /**
   * Method to search features
   * 
   * @param options.layer
   * @param { 'api' | 'ows' } options.search_endpoint
   * @param options.filter
   * @param options.raw
   * @param options.queryUrl
   * @param options.feature_count
   * @param options.formatter
   * @param options.ordering
   * 
   * @returns { Promise<{ data: [], query: { type: 'search', search: * }, type: 'api' | 'ows' }> }
   */
  this.features = async function(options = {
    layer,
    search_endpoint,
    filter,
    raw: false,
    queryUrl,
    feature_count,
    formatter: 1,
    ordering,
  }) {
    
    const promises                = [];
    const { layer, ...params }    = options;
    const { raw = false, filter } = options;
    let data                      = [];
    const layers                  = Array.isArray(layer) ? layer : [layer];                         // check if layer is array
    params.filter                 = Array.isArray(params.filter) ? params.filter : [params.filter]; // check if filter is array

    // if 'api' or 'ows' search_endpoint
    if ('api' === params.search_endpoint) {
      layers.forEach((layer, i) => promises.push(layer.searchFeatures({ ...params, filter: params.filter[i] })));
    } else {
      promises
        .push(new Promise((resolve, reject) => {
          layers[0]                                                  // get query provider for get one request only
          .getProvider('search')
          .query({ ...params, layers, ...layers[0].getSearchParams() /* get search params*/ })
          .then(data => { resolve({ data })})
          .catch(reject)
        }));
    }

    (await Promise.allSettled(promises))
      .forEach(({ status, value } = {}) => {
        // filter only fulfilled response
        if ('fulfilled' !== status) { 
          return;
        }
        if (raw) {
          data.push('api' === params.search_endpoint ? { data: value } : value);
        } else if ('api' !== params.search_endpoint) {
          data = value.data = undefined !== value.data ? value.data : [];
        } else if(Array.isArray(value.data) && value.data.length) {
          data.push(value.data[0]);
        }
      });

    return {
      data,
      query: {
        type: 'search',
        search: filter,
      },
      type: params.search_endpoint,
    };
  };

  /**
   * Return feature from api
   * 
   * @param opts.layer
   * @param opts.formatter
   * @param opts.fids
   * 
   * @returns { Promise<{ data: Array<{ layer: *, features: []}>, query: { type: 'search' }}> } 
   */
  this.fids = async function({
    layer,
    formatter = 0,
    fids      = [],
  } = {}) {
    const features = []; 
    try {
      const feats = layer && await layer.getFeatureByFids({ fids, formatter });
      if (feats) {
        feats.forEach(f => features.push(createOlFeatureFromApiResponseFeature(f)));
      }
    } catch(err) {
      console.warn(err);
    }
    return {
      data: [{
        layer,
        features
      }],
      query: { type: 'search' },
    };
  };

  /**
   * Search service function to load many layers with each one with its fids
   * 
   * @param options.layers    - Array of layers that we want serach fids features
   * @param options.fids      - Array of array of fids
   * @param options.formatter - how we want visualize
   * 
   * @returns { Promise<{ data: [], query: { type: 'search' }}> }
   */
  this.layersfids = async function({
    layers    = [],
    fids      = [],
    formatter = 0,
  } = {}) {
    const promises = [];
    const data     = [];
    layers.forEach((layer, i) => { promises.push(this.fids({ layer, fids: fids[i], formatter })) });
    try {
      (await Promise.all(promises)).forEach(response => { data.push(response.data) });
    } catch(err) {
      console.warn(err);
    }
    return {
      data,
      query: { type: 'search' }
    };
  }

}

inherit(SearchService, BaseService);

export default new SearchService();