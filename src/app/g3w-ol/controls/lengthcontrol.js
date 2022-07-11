import LenghtIteraction from '../interactions/lengthinteraction';
import MeasureControl from './measurecontrol';

class LengthControl extends MeasureControl {
  constructor(options = {}) {
    super({
      ...options,
      name: "length",
      tipLabel: 'sdk.mapcontrols.measures.length.tooltip',
      label: '\ue908',
      clickmap: true, // set ClickMap
      interactionClass: LenghtIteraction,
    });
  }
}

export default LengthControl;
