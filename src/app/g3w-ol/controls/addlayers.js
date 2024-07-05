const Control = require('g3w-ol/controls/control');

module.exports = class AddLayersControl extends Control {

  constructor() {
    super({
      name:     "addlayer",
      tipLabel: "sdk.mapcontrols.addlayer.tooltip",
      label:    "\ue907"
    });
    this._layerstore = null;
  }

  setMap(map) {
    Control.prototype.setMap.call(this,map);
    $(this.element).on('click', () => this.dispatchEvent('addlayer'));
  }

  getLayersSore() {
    return this._layerstore;
  }

  setLayersStore(layersStore) {
    this._layerstore = layersStore;
  }

}