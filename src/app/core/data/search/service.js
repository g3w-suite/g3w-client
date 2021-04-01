const {base, inherit} = require('core/utils/utils');
const BaseService = require('core/data/service');

function SearchService(){
  base(this);
  // method to searchfeature features
  this.features = async function(options={layer, search_endpoint, filter, queryUrl, feature_count}){
    const {layer, ...params} = options;
    return await layer.searchFeatures(params);
  }
}

inherit(SearchService, BaseService);

module.exports = new SearchService();