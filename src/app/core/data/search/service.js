const {base, inherit} = require('core/utils/utils');
const BaseService = require('core/data/service');

function SearchService(){
  base(this);
  // method to searchfeature features
  this.features = async function(options={layer, search_endpoint, filter, queryUrl, feature_count}){
    const {layer, ...params} = options;
    let data;
    try {
      data = await layer.searchFeatures(params);
    } catch (err){
    }
    return data;
  }
}

inherit(SearchService, BaseService);

module.exports = new SearchService();