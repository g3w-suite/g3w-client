import Control  from './control';
class AddLayersControl extends Control {
  constructor(options={}) {
    options = {
      name: "addlayer",
      tipLabel: "sdk.mapcontrols.addlayer.tooltip",
      label: "\ue907"
    };
    super(options);
    this._layerstore = null;
  }

  setMap(map) {
    Control.prototype.setMap.call(this,map);
    $(this.element).on('click', () => this.dispatchEvent('addlayer'));
  };

  layout(map) {
    Control.prototype.layout.call(this, map);
  };

  getLayersSore() {
    return this._layerstore;
  };

  setLayersStore(layersStore) {
    this._layerstore = layersStore;
  };
}

export default  AddLayersControl;
