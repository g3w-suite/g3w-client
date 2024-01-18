import MapLayersStoresRegistry                 from 'store/map-layers';
import GUI                                     from 'services/gui';
import { getQueryLayersPromisesByCoordinates } from 'utils/getQueryLayersPromisesByCoordinates';

const PickFeatureInteraction     = require('g3w-ol/interactions/pickfeatureinteraction');
const PickCoordinatesInteraction = require('g3w-ol/interactions/pickcoordinatesinteraction');

function PickLayerService(options={}) {
  this.pick_type = options.pick_type || 'wms';
  this.ispicked = false;
  this.fields = options.fields || [options.value];
  this.layerId = options.layer_id;
  this.mapService = GUI.getService('map');
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
    const values = {};
    this.ispicked = true;
    const afterPick = feature => {
      if (feature) {
        const attributes = feature.getProperties();
        this.fields.forEach(field =>{
          values[field] = attributes[field];
        });
        resolve(values);
      } else reject();
      this.ispicked = false;
      this.unpick();
    };
    GUI.setModal(false);
    this.mapService.addInteraction(this.interaction);
    this.interaction.once('picked', event => {
      if (this.pick_type === 'map') {
        const feature = event.feature;
        afterPick(feature);
      } else if (this.pick_type === 'wms'){
        const layer = MapLayersStoresRegistry.getLayerById(this.layerId);
        if (layer) {
          getQueryLayersPromisesByCoordinates(
            [layer],
            {
              map: this.mapService.getMap(),
              feature_count: 1,
              coordinates: event.coordinate
            }).then(response => {
              const {data=[]} = response[0];
              const feature = data.length && data[0].features[0] || null;
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
  this.unbindEscKeyUp();
  this.ispicked = false;
};

proto.clear = function() {
  this.isPicked() && this.unpick();
  this.mapService = this.interaction = this.field = null;
};

module.exports = PickLayerService;
