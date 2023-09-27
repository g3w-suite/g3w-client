/**
 * @file
 * @since v3.6
 */

const { base, inherit }                         = require('core/utils/utils');
const { createOlFeatureFromApiResponseFeature } = require('core/utils/geo');
const BaseService                               = require('core/data/service');

function SearchService() {

  base(this);

  /**
   * Method to search features
   * 
   * @param options.layer
   * @param options.search_endpoint
   * @param options.filter
   * @param options.raw
   * @param options.queryUrl
   * @param options.feature_count
   * @param options.formatter
   * @param options.ordering
   */
  this.features = async function(options = {
    layer,
    search_endpoint,
    filter,
    raw:false,
    queryUrl,
    feature_count,
    formatter:1,
    ordering,
  }) {
    
    const promisesSearch          = [];
    const { layer, ...params }    = options;
    const { raw = false, filter } = options;

    const dataSearch              = {
      data: [],
      query: {
        type: 'search',
        search: filter,
      },
      type: params.search_endpoint,
    };


    const layers  = Array.isArray(layer) ? layer : [layer];                         // check if layer is array
    params.filter = Array.isArray(params.filter) ? params.filter : [params.filter]; // check if filter is array

    // if api or ows search_endpoint
    if ('api' === params.search_endpoint){
      layers.forEach((layer, index) => promisesSearch.push(layer.searchFeatures({ ...params, filter: params.filter[index] })));
    } else {
      // need to get query provider for get one request only
      const provider = layers[0].getProvider('search');
      const promise = new Promise((resolve, reject) =>{
        provider.query({
          ...params,
          layers,
          ...layers[0].getSearchParams() // need to get search params
        }).then(data =>{
          resolve({
            data
          })
        }).fail(reject)
      });
      promisesSearch.push(promise);
    }

    const responses = await Promise.allSettled(promisesSearch);

    responses.forEach(({ status, value } = {}) => {
      if ('fulfilled' === status) { // need to filter only fulfilled response
        if (raw) {
          dataSearch.data.push('api' === params.search_endpoint ? { data: value } : value);
        } else {
          const { data = [] } = value;
          if ('api' !== params.search_endpoint) {
            dataSearch.data = data;
          } else if(data.length) {
            dataSearch.data.push(data[0]);
          }
        }
      }
    });

    return dataSearch;
  };

  /**
   * Return feature from api
   * 
   * @param opts.layer
   * @param opts.formatter
   * @param opts.fids
   * 
   * @returns { Promise<{data: [], layer}|{data: [{features: ([*]|[]), query: {type: string}, layer: *}]}> }
   */
  this.fids = async function({
    layer,
    formatter=0,
    fids=[]
  } = {}) {
    const response = {
      data:  [ { layer, features: [] } ],
      query: { type: 'search' }
    };
    try {
      const features = layer && await layer.getFeatureByFids({fids, formatter});
      if (features) {
        features.forEach(f => response.data[0].features.push(createOlFeatureFromApiResponseFeature(f)));
      }
    } catch(err) {
      console.warn(err);
    }
    return response;
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
    layers=[],
    fids=[],
    formatter=0
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