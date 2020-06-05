const PickFeatureInteraction = require('g3w-ol3/src/interactions/pickfeatureinteraction');
const GUI = require('gui/gui');

function PickLayerService(options={}) {
  this._layersfields = options.layers || [];
  this._mapService = GUI.getComponent('map').getService();
  const layers = this._layersfields.map((option) => {
    return this._mapService.getLayerById(option.layer)
  });
  this._interaction = new PickFeatureInteraction({
    layers
  })
}

const proto = PickLayerService.prototype;

proto.pick = function() {
  return new Promise((resolve, reject) => {
    GUI.setModal(false);
    this._mapService.addInteraction(this._interaction);
    this._interaction.once('picked', (event) => {
      const layerId = event.layer.get('id');
      const feature = event.feature;
      const {field} = this._layersfields.find((layerfield) => {
        return layerfield.layer === layerId;
      });
      const value = feature.getProperties()[field];
      this.unpick();
      resolve(value)
    })
  })
};

proto.unpick = function() {
  this._mapService.removeInteraction(this._interaction);
  GUI.setModal(true);

};

proto.clear = function() {
  this.unpick();
  this._mapService = this._interaction = this._field = null;
};

module.exports = PickLayerService;
