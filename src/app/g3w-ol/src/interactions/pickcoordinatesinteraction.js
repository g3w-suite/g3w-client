import {Pointer} from "ol/interaction";

const PickCoordinatesEventType = {
  PICKED: 'picked'
};

const PickCoordinatesEvent = function(type, coordinate) {
  this.type = type;
  this.coordinate = coordinate;
};

class PickCoordinatesInteraction extends Pointer {
  constructor() {
    super({
      handleDownEvent: PickCoordinatesInteraction.handleDownEvent_,
      handleUpEvent: PickCoordinatesInteraction.handleUpEvent_,
      handleMoveEvent: PickCoordinatesInteraction.handleMoveEvent_
    });
    this.previousCursor_ = null;
    this._centerMap = null;
  }

  handleDownEvent_(event) {
    this._centerMap = event.map.getView().getCenter();
    // set timeout to avoid to block pan
    setTimeout(() => {
      if (this._centerMap === event.map.getView().getCenter()) {
        super.handleUpEvent_(event);
      }
    }, 300);
    // return false to avoid  start of drag event
    return false
  };

  handleUpEvent_(event) {
    this.dispatchEvent(
      new PickCoordinatesEvent(
        PickCoordinatesEventType.PICKED,
        event.coordinate));
    // it used to stop drag event
    return false;
  };

  handleMoveEvent_(event) {
    const elem = event.map.getTargetElement();
    elem.style.cursor =  'pointer';
    return true;
  };

  shouldStopEvent() {
    return false;
  };

  setActive(active) {
    const map = this.getMap();
    if (map) {
      const elem = map.getTargetElement();
      elem.style.cursor = '';
    }
    super.setActive(active);
  };

  setMap(map){
    if (!map) {
      const elem = this.getMap().getTargetElement();
      elem.style.cursor = '';
    }
    super.setMap(map);
  };
}

export default  PickCoordinatesInteraction;
