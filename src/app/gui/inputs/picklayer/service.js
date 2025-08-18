import { QUERY_POINT_TOLERANCE }  from 'g3w-constants';
import GUI                        from 'services/gui';
import PickFeatureInteraction     from 'map/interactions/pickfeatureinteraction';
import PickCoordinatesInteraction from 'map/interactions/pickcoordinatesinteraction';

module.exports = class PickLayerService {
  constructor(opts = {}) {
    this.pick_type   = opts.pick_type || 'wms';
    this.ispicked    = false;
    this.fields      = opts.fields || [opts.value];
    this.layerId     = opts.layer_id;
    //'map' referred to a v4.0.x where getEditingLayer was a method of Layer.  
    this.interaction = 'map' === this.pick_type  ? new PickFeatureInteraction({
      layers: [GUI.getLayerById(this.layerId)]
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
      GUI.addInteraction(this.interaction);

      this.interaction.once('picked', async e => {
        try {
          let feature = e.feature; 
          const layer = 'wms' === this.pick_type && GUI.getProjectLayer(this.layerId);
          if (layer) {
            const response = await layer.query({
              feature_count:         1,
              coordinates:           e.coordinate,
              query_point_tolerance: QUERY_POINT_TOLERANCE,
              mapProjection:         GUI.getMap().getView().getProjection(),
              size:                  GUI.getMap().getSize(),
              resolution:            GUI.getMap().getView().getResolution()
            });
            feature = response?.data?.at?.(0)?.features?.at(0) ?? null;
          }
          afterPick(feature);
        } catch (e) {
          console.warn(e);
        }
      })
    })
  };

  /**
   *
   */
  unpick() {
    GUI.removeInteraction(this.interaction);
    GUI.setModal(true);
    this.unbindEscKeyUp();
    this.ispicked = false;
  };

  /**
   *
   */
  clear() {
    if (this.isPicked()) { this.unpick() }
    this.interaction = this.field = null;
  };
};