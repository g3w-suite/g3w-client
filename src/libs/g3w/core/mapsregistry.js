var inherit = require('g3w/core/utils').inherit;
var layersRegistry = require('g3w/core/layers/layersregistry');
var layersRegistry = require('./map');

function service(){
  this.addMap = function(options){
    _service.addMap(options);
  };
  
  this.getMap = function(id){
    return _service.getMap(id);
  }
}

// Make the public service en Event Emitter
inherit(service,EventEmitter);

var _service = {
  maps: {},
  
  addMap: function(options){
    layersStore = layersRegistry.getLayersStore(options.layersStoreId);
    options = _.merge(options,{
        layersStore:layersStore
      }
    );
    var map = new map(options);
    this.maps[options.id] = map;
  },
  
  getMap: function(id){
    return this.maps[id];
  }
};

module.exports = new service();

