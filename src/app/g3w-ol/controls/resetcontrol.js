const InteractionControl = require('g3w-ol/controls/interactioncontrol');

module.exports = class ResetControl extends InteractionControl {

  constructor(options){
    super({
      ...options,
      name:     "reset",
      tipLabel: "Pan",
      label:    "\ue901"
    });
    this._toggled = true;
    this._startCoordinate = null;
  }

  _postRender() {
    this.toggle(true);
  }

}