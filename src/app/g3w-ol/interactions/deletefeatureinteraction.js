const DeleteInteractionEvent = function(type, layer, features, coordinate) {
  this.type = type;
  this.features = features;
  this.coordinate = coordinate;
};

const DeleteInteraction = function(options) {
  ol.interaction.Pointer.call(this, {
    handleDownEvent: DeleteInteraction.handleDownEvent_,
    handleMoveEvent: DeleteInteraction.handleMoveEvent_,
    handleUpEvent: DeleteInteraction.handleUpEvent_,
    handleEvent: DeleteInteraction.handleEvent_
  });

  this.previousCursor_ = undefined;
  this.startCursor_ = undefined;
  this.lastCoordinate_ = null;
  this.features_ = options.features !== undefined ? options.features : null;
  this.layer_ = options.layer !== undefined ? options.layer : null;
  this.map_ = null;
};

ol.inherits(DeleteInteraction, ol.interaction.Pointer);

DeleteInteraction.handleEvent_ = function(mapBrowserEvent) {
  if (mapBrowserEvent.type == 'keydown'){
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
    return ol.interaction.Pointer.handleEvent.call(this,mapBrowserEvent);
  }
};

DeleteInteraction.handleDownEvent_ = function(event) {
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

DeleteInteraction.handleMoveEvent_ = function(event) {
  this.map_  = event.map;
  const elem = this.map_.getTargetElement();
  if (undefined === this.startCursor_) { this.startCursor_ = elem.style.cursor }
  const intersectingFeature = this.map_.forEachFeatureAtPixel(event.pixel, (feature, layer) =>  {
    ///check if is the same layer of editing
    feature = (layer == this.layer_) ? feature : null;
    return feature;
  });
  if (intersectingFeature) {
    this.previousCursor_ = elem.style.cursor;
    elem.style.cursor    =  'pointer';

  } else {
    elem.style.cursor = undefined !== this.previousCursor_
      ? this.previousCursor_
      : '';
    this.previousCursor_ = undefined;
  }
};

DeleteInteraction.prototype.featuresAtPixel_ = function(pixel, map) {
  let found = null;
  const intersectingFeature = map.forEachFeatureAtPixel(pixel, feature => feature);
  if (this.features_ && this.features_.getArray().includes(intersectingFeature)) {
    found = intersectingFeature;
  }
  return found;
};

DeleteInteraction.prototype.clear = function() {
  let elem;
  if (this.map_) {
    elem = this.map_.getTargetElement();
    elem.style.cursor = this.startCursor_;
  }
};

module.exports = DeleteInteraction;
