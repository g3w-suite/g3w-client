import {unByKey} from 'ol/Observable';
import InteractionControl  from './interactioncontrol';
import PickCoordinatesInteraction  from '../interactions/pickcoordinatesinteraction';

class QueryControl extends InteractionControl {
  constructor(options={}) {
    options = {
      ...options,
      offline: false,
      name: "querylayer",
      tipLabel: "sdk.mapcontrols.query.tooltip",
      label: options.label || "\uea0f",
      clickmap: true, // set ClickMap
      interactionClass: PickCoordinatesInteraction,
    };
    super(options);
  }

  setMap(map) {
    let eventToggledKey;
    const querySingleClickFnc = event => {
      this.dispatchEvent({
        type: 'picked',
        coordinates: event.coordinate
      });
      this._autountoggle && this.toggle(true);
    };
    if (map) {
      eventToggledKey = this.on('toggled', event => {
        const toggled = event.target.isToggled();
        toggled && map.on('singleclick', querySingleClickFnc) || map.un('singleclick', querySingleClickFnc);
      });
    } else unByKey(eventToggledKey);
    super.setMap(map);
  };

}

export default  QueryControl;
