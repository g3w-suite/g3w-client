import InteractionControl  from './interactioncontrol';

class ResetControl extends InteractionControl {
  constructor(options={}) {
    options = {
      ...options,
      name: "reset",
      tipLabel: "Pan",
      label: "\ue901"
    };
    super(options);
    this._toggled = true;
    this._startCoordinate = null;
  }
  _postRender(){
    this.toggle(true);
  };
}

export default ResetControl;


