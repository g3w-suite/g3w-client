var inherit = require('g3w/core/utils').inherit;
var geoService = require('geo/geo.service');

// Public interface
function service(){
  geoService.once('loaded',function(){
      //console.log('Configuro catalog service');
  });
  this.getLayersTree = function(){
    return geoService.getLayersTree();
  };
}

// Make the public service en Event Emitter
inherit(service,EventEmitter);

// Private
var _service = {
};

module.exports = new service();

