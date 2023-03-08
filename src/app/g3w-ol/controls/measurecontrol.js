const InteractionControl = require('g3w-ol/controls/interactioncontrol');

const MeasureControl = function(options={}) {
  this._map = null;
  InteractionControl.call(this, options);
};

ol.inherits(MeasureControl, InteractionControl);

const proto = MeasureControl.prototype;

/**
 * @param {ol.Map} map 
 */
proto.setMap = function(map) {
  InteractionControl.prototype.setMap.call(this, map);
};

/**
 * @param {boolean} toggle 
 */
proto.toggle = function(toggle) {

  InteractionControl.prototype.toggle.call(this, toggle);

  // clean up measurements (if it was activated)
  if (!this.isToggled() && this.getInteraction()) {
    this.getInteraction().clear();
  }
};

module.exports = MeasureControl;
