var PickCoordinatesEventType = {
  PICKED: 'picked'
};

var PickCoordinatesEvent = function(type, coordinate) {
  this.type = type;
  this.coordinate = coordinate;
};

var PickCoordinatesInteraction = function(options) {
  this.previousCursor_ = null;
  
  ol.interaction.Pointer.call(this, {
    handleDownEvent: PickCoordinatesInteraction.handleDownEvent_,
    handleUpEvent: PickCoordinatesInteraction.handleUpEvent_,
    handleMoveEvent: PickFeatureInteraction.handleMoveEvent_,
  });
};
ol.inherits(PickCoordinatesInteraction, ol.interaction.Pointer);

PickCoordinatesInteraction.handleDownEvent_ = function(event) {
  return true;
};

PickCoordinatesInteraction.handleUpEvent_ = function(event) {
  this.dispatchEvent(
          new PickCoordinatesEvent(
              PickCoordinatesEventType.PICKED,
              event.coordinate));
  return true;
};

PickCoordinatesInteraction.handleMoveEvent_ = function(event) {
  var elem = event.map.getTargetElement();
  this.previousCursor_ = elem.style.cursor;
  elem.style.cursor =  'pointer';
};

PickCoordinatesInteraction.prototype.shouldStopEvent = function(){
  return false;
};

PickCoordinatesInteraction.prototype.setActive = function(active){
  var elem = event.map.getTargetElement();
  elem.style.cursor = this.previousCursor_;
  ol.interaction.Pointer.prototype.setActive.call(this,active);
};

module.exports = PickCoordinatesInteraction;
