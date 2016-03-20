var inherit = require('g3w/core/utils').inherit;

function map(options){
  var map = new _map(options);
  
}

inherit(service,EventEmitter);

function _map(options){
  this.options = options;
  this.layersStore = options.layersStore;
};

module.exports = map;
