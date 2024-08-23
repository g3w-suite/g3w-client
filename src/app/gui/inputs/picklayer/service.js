import GUI                                     from 'services/gui';
import { getQueryLayersPromisesByCoordinates } from 'utils/getQueryLayersPromisesByCoordinates';
const PickFeatureInteraction     = require('g3w-ol/interactions/pickfeatureinteraction');
const PickCoordinatesInteraction = require('g3w-ol/interactions/pickcoordinatesinteraction');

module.exports = class PickLayerService {
  constructor(opts = {}) {
    this.pick_type   = opts.pick_type || 'wms';
    this.ispicked    = false;
    this.fields      = opts.fields || [opts.value];
    this.layerId     = opts.layer_id;
    this.mapService  = GUI.getService('map');
    this.interaction = 'map' === this.pick_type  ? new PickFeatureInteraction({
      layers: [this.mapService.getLayerById(this.layerId)]
    }) : new PickCoordinatesInteraction();
  }

  /**
   *
   * @return {boolean|*}
   */
  isPicked() {
    return this.ispicked;
  };

  /**
   *  bind interrupt event
   */
  escKeyUpHandler({ keyCode, data : { owner } }) {
    if (27 === keyCode) { owner.unpick() }
  };

  unbindEscKeyUp() {
    $(document).unbind('keyup', this.escKeyUpHandler);
  };

  bindEscKeyUp() {
    $(document).on('keyup', { owner: this }, this.escKeyUpHandler);
  };

  /**
   *
   * @return {Promise<unknown>}
   */
  pick() {
    return new Promise((resolve, reject) => {
      this.bindEscKeyUp();
      const values = {};
      this.ispicked = true;
      const afterPick = feature => {
        if (feature) {
          const attributes = feature.getProperties();
          //filter eventually null or undefined field
          this.fields.filter(f => f).forEach(field => values[field] = attributes[field]);
          resolve(values);
        } else {
          reject();
        }
        this.ispicked = false;
        this.unpick();
      };
      GUI.setModal(false);
      this.mapService.addInteraction(this.interaction);

      this.interaction.once('picked', e => {
        if ('map' === this.pick_type) {
          const feature = e.feature;
          afterPick(feature);
        } else if ('wms' === this.pick_type) {
          const layer = GUI.getService('map').getProjectLayer(this.layerId);
          if (layer) {
            getQueryLayersPromisesByCoordinates(
              [layer],
              {
                map:           this.mapService.getMap(),
                feature_count: 1,
                coordinates:   e.coordinate
              })
              .then(response => {
               const { data = [] } = response[0];
               const feature = data.length && data[0].features[0] || null;
               afterPick(feature);
             })
              .fail(e => console.warn(e) )
          }
        }
      })
    })
  };

  /**
   *
   */
  unpick() {
    this.mapService.removeInteraction(this.interaction);
    GUI.setModal(true);
    this.unbindEscKeyUp();
    this.ispicked = false;
  };

  /**
   *
   */
  clear() {
    if (this.isPicked()) { this.unpick() }
    this.mapService = this.interaction = this.field = null;
  };
};