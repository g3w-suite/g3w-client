var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');

function LoaderLayerService() {
  this._layers = {};
  this._type = 'tipo di layers';
  this._isReady = false;
  base(this);
}
inherit(LoaderLayerService, G3WObject);

var proto = LoaderLayerService.prototype;

proto.getLoaderType = function() {
    return this._type;
};

proto.getLayers = function() {
  return this._layers;
};

proto.getLayer = function(layerName) {
  return this._layers[layerName];
};

proto.loadLayer = function(url, options) {
  //TODO
};
proto.loadLayers = function() {
  //TODO
};

proto.cleanUpLayers = function() {
  //TODO
};

proto.setReady = function(bool) {
  this._isReady = bool;
};

proto.isReady = function() {
  return this._isReady;
};

// setto il modo di caricare il layer
proto.setMode = function(mode) {
  switch(mode){
    case 'w':
      this._editingMode = true;
      break;
    case 'r':
      this._editingMode = false;
      break;
  }
  this._mode = mode;
  this.emit('setmode', mode);
};

proto.getMode = function() {
  return this._mode;
};



module.exports = LoaderLayerService;