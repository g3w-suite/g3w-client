import PickFeatureInteraction from 'g3w-ol/interactions/pickfeatureinteraction';
import PickCoordinatesInteraction from 'g3w-ol/interactions/pickcoordinatesinteraction';
import MapCatalogLayersRegistry from 'core/map/maplayersstoresregistry';
import geoutils from 'core/utils/geo';
import GUI from 'gui/gui';

class PickLayerService {
  constructor(options = {}) {
    this.pick_type = options.pick_type || 'wms';
    this.ispicked = false;
    this.fields = options.fields || [options.value];
    this.layerId = options.layer_id;
    this.mapService = GUI.getService('map');
    this.interaction = this.pick_type === 'map' ? new PickFeatureInteraction({
      layers: [this.mapService.getLayerById(this.layerId)],
    }) : new PickCoordinatesInteraction();
  }

  isPicked() {
    return this.ispicked;
  }

  // bind interrupt event
  escKeyUpHandler({ keyCode, data: { owner } }) {
    keyCode === 27 && owner.unpick();
  }

  unbindEscKeyUp() {
    $(document).unbind('keyup', this.escKeyUpHandler);
  }

  bindEscKeyUp() {
    $(document).on('keyup', { owner: this }, this.escKeyUpHandler);
  }

  pick() {
    return new Promise((resolve, reject) => {
      this.bindEscKeyUp();
      const values = {};
      this.ispicked = true;
      const afterPick = (feature) => {
        if (feature) {
          const attributes = feature.getProperties();
          this.fields.forEach((field) => {
            values[field] = attributes[field];
          });
          resolve(values);
        } else reject();
        this.ispicked = false;
        this.unpick();
      };
      GUI.setModal(false);
      this.mapService.addInteraction(this.interaction);
      this.interaction.once('picked', (event) => {
        if (this.pick_type === 'map') {
          const { feature } = event;
          afterPick(feature);
        } else if (this.pick_type === 'wms') {
          const layer = MapCatalogLayersRegistry.getLayerById(this.layerId);
          if (layer) {
            geoutils.getQueryLayersPromisesByCoordinates(
              [layer],
              {
                map: this.mapService.getMap(),
                feature_count: 1,
                coordinates: event.coordinate,
              },
            ).then((response) => {
              const { data = [] } = response[0];
              const feature = data.length && data[0].features[0] || null;
              afterPick(feature);
            });
          }
        }
      });
    });
  }

  unpick() {
    this.mapService.removeInteraction(this.interaction);
    GUI.setModal(true);
    this.unbindEscKeyUp();
    this.ispicked = false;
  }

  clear() {
    this.isPicked() && this.unpick();
    this.mapService = this.interaction = this.field = null;
  }
}

export default PickLayerService;
