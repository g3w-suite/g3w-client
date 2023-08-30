/**
 * @file
 * @since v3.6
 */

const { base, inherit } = require('core/utils/utils');
const { createOlFeatureFromApiResponseFeature } = require('core/utils/geo');
const BaseService = require('core/data/service');

function SearchService(){
  base(this);
  // method to searchfeature features
  this.features = async function(options={layer, search_endpoint, filter, raw:false, queryUrl, feature_count, ordering}){
    const promisesSearch =[];
    const {layer, ...params} = options;
    const {raw=false, filter} = options;
    const dataSearch = {
      data: [],
      query: {
        type: 'search',
        search: filter
      },
      type: params.search_endpoint
    };
    // check if layer is array
    const layers = Array.isArray(layer) ? layer : [layer];
    //check if filter is array
    params.filter = Array.isArray(params.filter) ? params.filter : [params.filter];
    // if api or ows search_endpoint
    if (params.search_endpoint === 'api')
      layers.forEach((layer, index) => promisesSearch.push(layer.searchFeatures({
        ...params,
        filter: params.filter[index]
      })));
    else {
      // need to get query provider for get one request only
      const provider = layers[0].getProvider('search');
      const promise = new Promise((resolve, reject) =>{
        provider.query({
          ...params,
          layers,
          ...layers[0].getSearchParams() // nee to get search params
        }).then(data =>{
          resolve({
            data
          })
        }).fail(reject)
      });
      promisesSearch.push(promise);
    }
    const responses = await Promise.allSettled(promisesSearch);
    responses.forEach(({status, value}={}) => {
      // need to filter only fulfilled response
      if (status === 'fulfilled'){
        if (raw) {
          dataSearch.data.push(params.search_endpoint === 'api' ? {
            data: value
          }: value );
        } else {
          const {data=[]} = value;
          params.search_endpoint === 'api' ? data.length && dataSearch.data.push(data[0]) : dataSearch.data = data;
        }
      }
    });
    return dataSearch;
  };

  /**
   * Method to return feature from api
   * @param layer
   * @param fid
   * @returns {Promise<{data: [], layer}|{data: [{features: ([*]|[]), query: {type: string}, layer: *}]}>}
   */
  this.fids = async function({layer, formatter=0, fids=[]}={}){
    const response = {
      data: [
        {
          layer,
          features:[],
        }
      ],
      query: {
        type: 'search'
      }
    };
    try {
      const features = layer && await layer.getFeatureByFids({fids, formatter});
      features && features.forEach(feature => response.data[0].features.push(createOlFeatureFromApiResponseFeature(feature)));
    } catch(err){}
    return response;
  };

  /**
   * Search service function to load many layers with each one with its fids
   * @param layers: Array of layers that we want serach fids features
   * @param fids: Array of array of fids
   * @param formatter: how we want visualize
   * @returns {Promise<void>}
   */
  this.layersfids = async function({layers=[], fids=[], formatter=0}={}){
    const promises = [];
    const response = {
      data: [],
      query: {
        type: 'search'
      }
    };
    layers.forEach((layer, index) =>{
      promises.push(this.fids({
        layer,
        fids: fids[index],
        formatter
      }))
    });
    try {
      const layersresponses = await Promise.all(promises);
      layersresponses.forEach(layerresponse =>response.data.push(layerresponse.data))
    } catch(err){
      console.log(err)
    }
    return response;
  }
}

inherit(SearchService, BaseService);

export default new SearchService();