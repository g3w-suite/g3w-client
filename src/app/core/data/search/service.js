const {base, inherit} = require('core/utils/utils');
const BaseService = require('../service');

function SearchService(){
  base(this);
  // method to searchfeature features
  this.searchFeatures = function(options={layer, search_endpoint, filter, queryUrl, feature_count}){
    const {layer, ...params} = options;
    return layer.searchFeatures(params);
  }
}

inherit(SearchService, BaseService);

module.exports = new SearchService();