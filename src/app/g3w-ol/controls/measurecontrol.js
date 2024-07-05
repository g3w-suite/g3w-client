const InteractionControl = require('g3w-ol/controls/interactioncontrol');

module.exports = class MeasureControl extends InteractionControl {

  constructor(options={}) {
    super(options);
    this._map = null;
  }

  /**
   * @param {boolean} toggle 
   */
  toggle(toggle) {
    InteractionControl.prototype.toggle.call(this, toggle);

    // clean up measurements (if it was activated)
    if (!this.isToggled() && this.getInteraction()) {
      this.getInteraction().clear();
    }
  }

}