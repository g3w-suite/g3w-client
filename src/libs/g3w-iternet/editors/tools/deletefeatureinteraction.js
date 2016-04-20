var DeleteInteractionEvent = function(type, features, coordinate) {

  this.type = type;
  this.features = features;
  this.coordinate = coordinate;
};

var DeleteInteraction = function(options) {
  ol.interaction.Pointer.call(this, {
    handleDownEvent: DeleteInteraction.handleDownEvent_,
    handleMoveEvent: DeleteInteraction.handleMoveEvent_,
    handleUpEvent: DeleteInteraction.handleUpEvent_,
    handleEvent: DeleteInteraction.handleEvent_,
  });

  this.previousCursor_ = undefined;
  this.lastCoordinate_ = null;
  this.features_ = options.features !== undefined ? options.features : null;
};
ol.inherits(DeleteInteraction, ol.interaction.Pointer);

DeleteInteraction.handleEvent_ = function(mapBrowserEvent) {
  if (mapBrowserEvent.type == 'keydown'){
    if(this.features_.getArray().length && mapBrowserEvent.originalEvent.keyCode == 46){
      this.dispatchEvent(
          new DeleteInteractionEvent(
              'deleteend', this.features_,
              event.coordinate));
      return true;
    }
  }
  else{
    return ol.interaction.Pointer.handleEvent.call(this,mapBrowserEvent);
  }
};

DeleteInteraction.handleDownEvent_ = function(event) {
  this.lastFeature_ = this.featuresAtPixel_(event.pixel, event.map);
  if (this.lastFeature_) {
    DeleteInteraction.handleMoveEvent_.call(this, event);
    this.dispatchEvent(
            new DeleteInteractionEvent(
                'deleteend', this.features_,
                event.coordinate));
    return true;
  }
  return false;
};

DeleteInteraction.handleMoveEvent_ = function(event) {
  var elem = event.map.getTargetElement();
  var intersectingFeature = event.map.forEachFeatureAtPixel(event.pixel,
      function(feature) {
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

DeleteInteraction.prototype.featuresAtPixel_ = function(pixel, map) {
  var found = null;

  var intersectingFeature = map.forEachFeatureAtPixel(pixel,
      function(feature) {
        return feature;
      });

  if (this.features_ &&
     _.includes(this.features_.getArray(), intersectingFeature)) {
    found = intersectingFeature;
  }

  return found;
};

module.exports = DeleteInteraction;
