const Control = require('./control');
function AddLayersControl() {
  const options = {
    name: "addlayer",
    tipLabel: "sdk.mapcontrols.addlayer.tooltip",
    label: "\ue907"
  };
  Control.call(this, options);
  this._layerstore = null;
}

ol.inherits(AddLayersControl, Control);

const proto = AddLayersControl.prototype;

proto.setMap = function(map) {
  Control.prototype.setMap.call(this,map);
  $(this.element).on('click', () => this.dispatchEvent('addlayer'));
};

proto.layout = function(map) {
  Control.prototype.layout.call(this, map);
};

proto.getLayersSore = function() {
  return this._layerstore;
};

proto.setLayersStore = function(layersStore) {
  this._layerstore = layersStore;
};

module.exports = AddLayersControl;
