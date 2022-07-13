const InteractionControl = require('./interactioncontrol');

const MeasureControl = function (options = {}) {
  this._map = null;
  InteractionControl.call(this, options);
};

ol.inherits(MeasureControl, InteractionControl);

const proto = MeasureControl.prototype;

proto.setMap = function (map) {
  InteractionControl.prototype.setMap.call(this, map);
};

proto.toggle = function (toggle) {
  InteractionControl.prototype.toggle.call(this, toggle);
  if (!this.isToggled() && this.getIteraction()) {
    // clean of the measure control if it was activated
    this.getIteraction().clear();
  }
};

module.exports = MeasureControl;
