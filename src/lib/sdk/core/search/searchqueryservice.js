var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');
var ProjectsRegistry = require('core/project/projectsregistry');
var QueryWFSProvider = require('./queryWFSProvider');


function SearchQueryService(){
  var self = this;
  this.url = "";
  this.filterObject = {};
  this.setFilterObject = function(){
    this.filterObject = {indice_var:1}
  };
  this.createQueryFilterObject = function(layerId, queryFilter){
    var layerFilterInfo = this.getLayerInfoFromProjectConfig(layerId);
    return {type: 'standard'}
  };

  this.getLayerInfoFromProjectConfig = function(layerId) {
    var layerInfo = ProjectsRegistry.getCurrentProject().getLayerById(layerId);
    if (layerInfo) {
      console.log(layerInfo);
      if (layerInfo.source && layerInfo.source.url){
        console.log('Source and url');
      } else {
        console.log('No Source and url');
      }
    }
    return {}
  };

  this.doQuerySearch = function(queryFilterObject){
    QueryWFSProvider.doSearch(queryFilterObject)
    .then(function(result){
      self.emit("searchresults", result)
    });
  };
  base(this);
}
inherit(SearchQueryService,G3WObject);

module.exports =  new SearchQueryService

