const PickCoordinatesEventType = { PICKED: 'picked' };

const PickCoordinatesEvent = function(type, coordinate) {
  this.type       = type;
  this.coordinate = coordinate;
};

const PickCoordinatesInteraction = function(options) {
  this.previousCursor_ = null;
  this._centerMap      = null;

  ol.interaction.Pointer.call(this, {
    handleDownEvent: PickCoordinatesInteraction.handleDownEvent_,
    handleUpEvent:   PickCoordinatesInteraction.handleUpEvent_,
    handleMoveEvent: PickCoordinatesInteraction.handleMoveEvent_
  });
};

ol.inherits(PickCoordinatesInteraction, ol.interaction.Pointer);

PickCoordinatesInteraction.handleDownEvent_ = function(event) {
  this._centerMap = event.map.getView().getCenter();
  // set timeout to avoid blocking pan
  setTimeout(() => {
    if (this._centerMap === event.map.getView().getCenter()) {
      PickCoordinatesInteraction.handleUpEvent_.call(this, event);
    }
  }, 300);
  // return false to avoid start of drag event
  return false
};

PickCoordinatesInteraction.handleUpEvent_ = function(event) {
  this.dispatchEvent(
    new PickCoordinatesEvent( PickCoordinatesEventType.PICKED, event.coordinate )
  );
  // it used to stop drag event
  return false;
};

PickCoordinatesInteraction.handleMoveEvent_ = function(e) {
  e.map.getTargetElement().style.cursor = 'pointer';
  return true;
};

PickCoordinatesInteraction.prototype.shouldStopEvent = function() {
  return false;
};

PickCoordinatesInteraction.prototype.setActive = function(active) {
  const map = this.getMap();
  if (map) {
    const elem        = map.getTargetElement();
    elem.style.cursor = '';
  }
  ol.interaction.Pointer.prototype.setActive.call(this,active);
};

PickCoordinatesInteraction.prototype.setMap = function(map) {
  if (!map) { this.getMap().getTargetElement().style.cursor = '' }
  ol.interaction.Pointer.prototype.setMap.call(this,map);
};

module.exports = PickCoordinatesInteraction;
