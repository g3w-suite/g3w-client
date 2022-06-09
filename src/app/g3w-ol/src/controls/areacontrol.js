import AreaIteraction  from '../interactions/areainteraction';
import MeasureControl  from './measurecontrol';

class AreaControl extends MeasureControl {
  constructor(options={}) {
    options = {
      ...options,
      tipLabel: "sdk.mapcontrols.measures.area.tooltip",
      label: "\ue909",
      clickmap: true, // set ClickMap
      interactionClass: AreaIteraction
    };
    super(options);
  }
};

export default  AreaControl;
