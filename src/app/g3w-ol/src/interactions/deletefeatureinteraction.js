import {Pointer} from "ol/interaction";

const DeleteInteractionEvent = function(type, layer, features, coordinate) {
  this.type = type;
  this.features = features;
  this.coordinate = coordinate;
};

class DeleteInteraction extends Pointer {
  constructor(option={}) {
    super({
      handleDownEvent: handleDownEvent_,
      handleMoveEvent: handleMoveEvent_,
      handleUpEvent: handleUpEvent_,
      handleEvent: handleEvent_
    });
    this.previousCursor_;
    this.startCursor_;
    this.lastCoordinate_ = null;
    this.features_ = options.features !== undefined ? options.features : null;
    this.layer_ = options.layer !== undefined ? options.layer : null;
    this.map_ = null;
  }

  clear() {
    let elem;
    if (this.map_) {
      elem = this.map_.getTargetElement();
      elem.style.cursor = this.startCursor_;
    }
  };
}

function handleEvent_(mapBrowserEvent) {
  if (mapBrowserEvent.type == 'keydown') {
    if(this.features_.getArray().length && mapBrowserEvent.originalEvent.keyCode == 46) {
      // an event can be string or an object with attribute type
      this.dispatchEvent(
        new DeleteInteractionEvent(
          'deleteend',
          this.layer_,
          this.features_,
          event.coordinate));
      return true;
    }
  }
  else {
    return this.handleEvent(mapBrowserEvent);
  }
};

function handleDownEvent_(event) {
  this.lastFeature_ = this.featuresAtPixel_(event.pixel, event.map);
  if (this.lastFeature_) {
    DeleteInteraction.handleMoveEvent_.call(this, event);
    this.dispatchEvent(
      new DeleteInteractionEvent(
        'deleteend',
        this.layer_,
        this.features_,
        event.coordinate));
    return true;
  }
  return false;
};

function handleMoveEvent_(event) {
  this.map_ = event.map;
  const elem = this.map_.getTargetElement();
  if (this.startCursor_ === undefined) {
    this.startCursor_ = elem.style.cursor;
  }
  const intersectingFeature = this.map_.forEachFeatureAtPixel(event.pixel, (feature, layer) =>  {
    feature = (layer == this.layer_) ? feature : null;
    return feature;
  });
  if (intersectingFeature) {
    this.previousCursor_ = elem.style.cursor;
    elem.style.cursor =  'pointer';

  } else {
    elem.style.cursor = this.previousCursor_ !== undefined ?
      this.previousCursor_ : '';
    this.previousCursor_ = undefined;
  }
};

function featuresAtPixel_(pixel, map) {
  let found = null;
  const intersectingFeature = map.forEachFeatureAtPixel(pixel, (feature) => {
    return feature;
  });
  if (this.features_ &&
    _.includes(this.features_.getArray(), intersectingFeature)) {
    found = intersectingFeature;
  }
  return found;
};


export default  DeleteInteraction;
