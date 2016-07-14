var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');

function MapsRegistry() {
  base(this);
  
  this._mapsServices = {
  };
  
  this.addMap = function(mapService) {
    this._registerMapService(mapService);
  };
  
  this._registerMapService = function(mapService) {
    var mapService = this._mapsServices[mapService.id]
    if (_.isUndefined(mapService)) {
      this._mapsServices[mapService.id] = mapService;
    }
  };
} 
inherit(MapsRegistry,G3WObject);

module.exports = MapsRegistry;
