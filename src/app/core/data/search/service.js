const {base, inherit} = require('core/utils/utils');
const BaseService = require('core/data/service');

function SearchService(){
  base(this);
  // method to searchfeature features
  this.features = async function(options={layer, search_endpoint, filter, queryUrl, feature_count}){
    const promisesSearch =[];
    const {layer, ...params} = options;
    const dataSearch = {
      data: [],
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
      const {data=[]} = value;
      params.search_endpoint === 'api' ? data.length && dataSearch.data.push(data[0]) : dataSearch.data = data;
    });
    return dataSearch;
  }
}

inherit(SearchService, BaseService);

module.exports = new SearchService();