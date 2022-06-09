import InteractionControl  from './interactioncontrol';
import {DragBox} from 'ol/interaction'
import {boundingExtent} from "ol/extent";

class ZoomBoxControl extends InteractionControl {
  constructor(options={}) {
    options = {
      ...options,
      name: "zoombox",
      tipLabel: "Zoom to box",
      label: "\ue901",
      interactionClass: DragBox
    };

    super(options);
    this._startCoordinate = null;
  }

  setMap(map) {
    super.setMap(map);
    this._interaction.on('boxstart', evt => this._startCoordinate = evt.coordinate);
    this._interaction.on('boxend', evt => {
      const start_coordinate = this._startCoordinate;
      const end_coordinate = evt.coordinate;
      const extent = boundingExtent([start_coordinate,end_coordinate]);
      this.dispatchEvent({
        type: 'zoomend',
        extent
      });
      this._startCoordinate = null;
      this._autountoggle && this.toggle();
    });
  };
}

export default ZoomBoxControl;


