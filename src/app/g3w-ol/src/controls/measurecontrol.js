import InteractionControl from './interactioncontrol';

class MeasureControl extends InteractionControl{
  constructor(options={}) {
    super(options);
    this._map = null;
  }
  setMap(map) {
    super.setMap(map);
  };

  toggle(toggle) {
    super.toggle();
    if (!this.isToggled() && this.getIteraction()) {
      //clean of the measure control if it was activated
      this.getIteraction().clear();
    }
  };
}

export default  MeasureControl;
