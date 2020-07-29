const PickFeatureInteraction = require('g3w-ol/src/interactions/pickfeatureinteraction');
const PickCoordinatesInteraction = require('g3w-ol/src/interactions/pickcoordinatesinteraction');
const MapCatalogLayersRegistry = require('core/map/maplayersstoresregistry');
const { getQueryLayersPromisesByCoordinates} = require('core/utils/geo');
const GUI = require('gui/gui');

function PickLayerService(options={}) {
  this.pick_type = options.pick_type || 'wms';
  this.ispicked = false;
  this.field = options.field || options.value;
  this.layerId = options.layer_id;
  this.contentPerc;
  this.mapService = GUI.getComponent('map').getService();
  this.interaction = this.pick_type === 'map' ?  new PickFeatureInteraction({
    layers: [this.mapService.getLayerById(this.layerId)]
  }) : new PickCoordinatesInteraction();
}

const proto = PickLayerService.prototype;

proto.isPicked = function(){
  return this.ispicked;
};

//bind interrupt event
proto.escKeyUpHandler = function({keyCode, data:{owner}}) {
  keyCode === 27 && owner.unpick();
};

proto.unbindEscKeyUp = function() {
  $(document).unbind('keyup', this.escKeyUpHandler);
};

proto.bindEscKeyUp = function() {
  $(document).on('keyup', {owner: this}, this.escKeyUpHandler);
};

proto.pick = function() {
  return new Promise((resolve, reject) => {
    this.bindEscKeyUp();
    let value;
    this.ispicked = true;
    const afterPick = (feature) => {
      if (feature) {
        value = feature.getProperties()[this.field];
        resolve(value);
      } else {
        reject();
      }
      this.ispicked = false;
      this.unpick();
    };
    this.contentPerc = GUI.getContentPercentage() === 100 && GUI.hideContent(true);
    GUI.setModal(false);
    this.mapService.addInteraction(this.interaction);
    this.interaction.once('picked', event => {
      if (this.pick_type === 'map') {
        const feature = event.feature;
        afterPick(feature);
      } else if (this.pick_type === 'wms'){
        const layer = MapCatalogLayersRegistry.getLayerById(this.layerId);
        if (layer) {
          getQueryLayersPromisesByCoordinates(
            [layer],
            {
              map: this.mapService.getMap(),
              feature_count: 1,
              coordinates: event.coordinate
            }).then(response => {
              const feature = response[0].data && response[0].data[0].features[0];
              afterPick(feature);
          })
        }
      }
    })
  })
};

proto.unpick = function() {
  this.mapService.removeInteraction(this.interaction);
  GUI.setModal(true);
  this.contentPerc && GUI.hideContent(false, this.contentPerc);
  this.unbindEscKeyUp();
  this.ispicked = false;
};

proto.clear = function() {
  this.isPicked() && this.unpick();
  this.mapService = this.interaction = this.field = null;
};

module.exports = PickLayerService;
