/**
 * @file
 * @since v3.6
 */

import { BaseService } from 'core/data/service';

const { createOlFeatureFromApiResponseFeature } = require('core/utils/geo');

class SearchService extends BaseService {

  /**
   * Search features
   */
  async features(options = {
    layer,
    search_endpoint,
    filter,
    raw:false,
    queryUrl,
    feature_count,
    ordering
  }) {

    const responses =[];

    const {
      layer,
      ...params
    } = options;

    const {
      raw = false,
      filter
    } = options;
  
    const dataSearch = {
      data: [],
      query: {
        type: 'search',
        search: filter
      },
      type: params.search_endpoint
    };

    const layers  = Array.isArray(layer) ? layer : [layer];
    params.filter = Array.isArray(params.filter) ? params.filter : [params.filter];

    if ('api' === params.search_endpoint) {
      layers
        .forEach(
          (layer, index) => responses.push(layer.searchFeatures({ ...params, filter: params.filter[index] }))
        );
    }

    // params.search_endpoint == 'ows' ??
    if ('api' !== params.search_endpoint) {
      const promise = new Promise((resolve, reject) => {
        layers[0]
          .getProvider('search')
          .query({ ...params, layers, ...layers[0].getSearchParams() })
          .then(data => { resolve({ data }) })
          .fail(reject);
      });
      responses.push(promise);
    }

    (await Promise.allSettled(responses))
      .forEach(
        ({ status, value } = {}) => {
          if (raw && 'fulfilled' === status) {
            dataSearch.data.push('api' === params.search_endpoint ? { data: value } : value );
          }
          if(!raw && 'fulfilled' === status) {
            const { data = [] } = value;
            params.search_endpoint === 'api' ? data.length && dataSearch.data.push(data[0]) : dataSearch.data = data;
          }
        }
      );

    return dataSearch;
  }

  /**
   * Return feature from api
   * 
   * @param opts.layer
   * @param opts.formatter
   * @param opts.fid
   * 
   * @returns {Promise<{data: [], layer}|{data: [{features: ([*]|[]), query: {type: string}, layer: *}]}>}
   */
  async fids({
    layer,
    formatter = 0,
    fids      = []
  } = {}) {
    const response = {
      data:  [{ layer, features: [] } ],
      query: { type: 'search' },
    };
    try {
      const features = layer && await layer.getFeatureByFids({fids, formatter});
      if (features) {
        features.forEach(feat => response.data[0].features.push(createOlFeatureFromApiResponseFeature(feat)));
      }
    } catch(e) {
      console.warn(e);
    } finally {
      return response;
    }
  };

  /**
   * Load many layers with each one with its fids
   * 
   * @param opts.layers    array of layers that we want serach fids features
   * @param opts.fids      array of array of fids
   * @param opts.formatter how we want visualize
   * 
   * @returns {Promise<void>}
   */
  async layersfids({
    layers    = [],
    fids      = [],
    formatter = 0,
  } = {}) {
    const responses = [];
    const response = {
      data:  [],
      query: { type: 'search' }
    };
    layers.forEach((layer, index) => {
      responses.push(this.fids({ layer, fids: fids[index], formatter }))
    });
    try {
      (await Promise.all(responses)).forEach(layer => response.data.push(layer.data))
    } catch(e) {
      console.warn(e)
    } finally {
      return response;
    }
  }

}

export default new SearchService();