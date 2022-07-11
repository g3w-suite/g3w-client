import { Pointer } from 'ol/interaction';

const PickCoordinatesEventType = {
  PICKED: 'picked',
};

const PickCoordinatesEvent = function (type, coordinate) {
  this.type = type;
  this.coordinate = coordinate;
};

class PickCoordinatesInteraction extends Pointer {
  constructor() {
    super({
      handleDownEvent: handleDownEvent_,
      handleUpEvent: handleUpEvent_,
      handleMoveEvent: handleMoveEvent_,
    });
    this.previousCursor_ = null;
    this._centerMap = null;
  }

  shouldStopEvent() {
    return false;
  }

  setActive(active) {
    const map = this.getMap();
    if (map) {
      const elem = map.getTargetElement();
      elem.style.cursor = '';
    }
    super.setActive(active);
  }

  setMap(map) {
    if (!map) {
      const elem = this.getMap().getTargetElement();
      elem.style.cursor = '';
    }
    super.setMap(map);
  }
}

function handleDownEvent_(event) {
  this._centerMap = event.map.getView().getCenter();
  // set timeout to avoid to block pan
  setTimeout(() => {
    if (this._centerMap === event.map.getView().getCenter()) {
      this.handleUpEvent(event);
    }
  }, 300);
  // return false to avoid  start of drag event
  return false;
}

function handleUpEvent_(event) {
  this.dispatchEvent(
    new PickCoordinatesEvent(
      PickCoordinatesEventType.PICKED,
      event.coordinate,
    ),
  );
  // it used to stop drag event
  return false;
}

function handleMoveEvent_(event) {
  const elem = event.map.getTargetElement();
  elem.style.cursor = 'pointer';
  return true;
}

export default PickCoordinatesInteraction;
