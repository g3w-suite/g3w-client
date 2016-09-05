var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');

function LoaderLayerService() {
    this._layers = {};
    this._type = 'tipo di layers';
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

module.exports = LoaderLayerService;
