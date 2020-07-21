const PickFeatureInteraction = require('g3w-ol/src/interactions/pickfeatureinteraction');
const PickCoordinatesInteraction = require('g3w-ol/src/interactions/pickcoordinatesinteraction');
const MapCatalogLayersRegistry = require('core/map/maplayersstoresregistry');
const { getQueryLayersPromisesByCoordinates} = require('core/utils/geo');
const GUI = require('gui/gui');

function PickLayerService(options={}) {
  console.log(options)
  this.pick_type = options.pick_type || 'map';
  this.ispicked = false;
  this.field = options.field || options.key;
  this.layerId = options.layer_id;
  this.contentPerc;
  this.mapService = GUI.getComponent('map').getService();
  this.interaction = this._pick_type === 'map' ?  new PickFeatureInteraction({
    layers
  }) : new PickCoordinatesInteraction();
}

const proto = PickLayerService.prototype;

proto.isPicked = function(){
  return this.ispicked;
};

proto.pick = function() {
  return new Promise((resolve, reject) => {
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
    this.interaction.once('picked', (event) => {
      if (this.pick_type === 'map') {
        this.layerId = event.layer.get('id');
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
};

proto.clear = function() {
  this.unpick();
  this.mapService = this.interaction = this._field = null;
  this.layersfields = null;
};

module.exports = PickLayerService;
