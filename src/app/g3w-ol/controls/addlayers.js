import { InteractionControl } from 'g3w-ol/controls/interactioncontrol';

module.exports = class AddLayersControl extends InteractionControl {

  constructor() {
    super({
      name:     "addlayer",
      tipLabel: "sdk.mapcontrols.addlayer.tooltip",
      label:    "\ue907"
    });
    this._layerstore = null;
  }

  setMap(map) {
    InteractionControl.prototype.setMap.call(this,map);
    $(this.element).on('click', () => this.dispatchEvent('addlayer'));
  }

  getLayersSore() {
    return this._layerstore;
  }

  setLayersStore(layersStore) {
    this._layerstore = layersStore;
  }

}