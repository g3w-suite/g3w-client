var inherit = require('./utils').inherit;
var base = require('./utils').base;
var G3WObject = require('./g3wobject');
var GUI = require('../gui/gui');

var ProjectService = require('./projectservice').ProjectService;

function MapQueryService() {
  base(this);
  
  this.queryPoint = function(coordinates,layerId) {
    
  };
  
  this.queryRect = function(rect,layerId) {
    
  };
  
  this._query = function(rect,layerId) {
    var layers;
    if (layerId) {
      layers = [ProjectService.getLayer(layerId)];
    }
    else {
      layers = ProjectService.getLayers();
    }
    
    
  };
}
inherit(MapQueryService,G3WObject);

module.exports = MapQueryService;
