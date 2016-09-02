var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');

function LoaderLayerService() {
    this._layers = {};
    this._type = 'tipo di layers';
    this._pluginState = {};
    base(this);
}

inherit(LoaderLayerService, G3WObject);

var proto = LoaderLayerService.prototype;

proto.getLayers = function() {
  return this._layers;
};

proto.getLayer = function(layerName) {
    return this._layers[layerName];
};

proto.loadLayer = function(url, options) {
  //codice qui
};

//ritorna lo state del plugin
proto.getPluginState = function() {
    return this._pluginState;
};

//setta lo state del plugin
proto.setPluginState = function(state) {
    this._pluginState = state;
}

module.exports = LoaderLayerService;
