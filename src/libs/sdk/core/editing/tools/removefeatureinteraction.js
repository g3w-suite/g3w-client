RemoveInteractionEvent = function(type, features, coordinate) {

  ol.events.Event.call(this, type);

  /**
   * The features being translated.
   * @type {ol.Collection.<ol.Feature>}
   * @api
   */
  this.features = features;

  /**
   * The coordinate of the drag event.
   * @const
   * @type {ol.Coordinate}
   * @api
   */
  this.coordinate = coordinate;
};
ol.inherits(RemoveEvent, ol.events.Event);


/**
 * @classdesc
 * Interaction for translating (moving) features.
 *
 * @constructor
 * @extends {ol.interaction.Pointer}
 * @fires RemoveInteractionEvent
 * @param {olx.interaction.TranslateOptions} options Options.
 * @api
 */
RemoveInteraction = function(options) {
  ol.interaction.Translate.call(this, {
    handleDownEvent: RemoveInteraction.handleDownEvent_,
    handleDragEvent: RemoveInteraction.handleDragEvent_,
    handleMoveEvent: RemoveInteraction.handleMoveEvent_,
    handleUpEvent: RemoveInteraction.handleUpEvent_
  });

  this.previousCursor_ = undefined;
  this.lastCoordinate_ = null;
  this.features_ = options.features !== undefined ? options.features : null;
  this.lastFeature_ = null;
};
goog.inherits(RemoveInteraction, ol.interaction.Translate);


RemoveInteraction.handleDownEvent_ = function(event) {
  this.lastFeature_ = this.featuresAtPixel_(event.pixel, event.map);
  if (!this.lastCoordinate_ && this.lastFeature_) {
    this.lastCoordinate_ = event.coordinate;
    RemoveInteraction.handleMoveEvent_.call(this, event);
    this.dispatchEvent(
        new RemoveInteractionEvent(
            'removestart', this.features_,
            event.coordinate));
    return true;
  }
  return false;
};

RemoveInteraction.handleUpEvent_ = function(event) {
  if (this.lastCoordinate_) {
    this.lastCoordinate_ = null;
    RemoveInteraction.handleMoveEvent_.call(this, event);
    this.dispatchEvent(
        new RemoveInteractionEvent(
            RemoveInteractionEventType.'removeend', this.features_,
            event.coordinate));
    return true;
  }
  return false;
};

RemoveInteraction.handleDragEvent_ = function(event) {
  if (this.lastCoordinate_) {
    var newCoordinate = event.coordinate;
    var deltaX = newCoordinate[0] - this.lastCoordinate_[0];
    var deltaY = newCoordinate[1] - this.lastCoordinate_[1];

    if (this.features_) {
      this.features_.forEach(function(feature) {
        var geom = feature.getGeometry();
        geom.translate(deltaX, deltaY);
        feature.setGeometry(geom);
      });
    } else if (this.lastFeature_) {
      var geom = this.lastFeature_.getGeometry();
      geom.translate(deltaX, deltaY);
      this.lastFeature_.setGeometry(geom);
    }

    this.lastCoordinate_ = newCoordinate;
    this.dispatchEvent(
        new RemoveInteractionEvent(
            RemoveInteractionEventType.TRANSLATING, this.features_,
            newCoordinate));
  }
};

RemoveInteraction.handleMoveEvent_ = function(event) {
  var elem = event.map.getTargetElement();
  var intersectingFeature = event.map.forEachFeatureAtPixel(event.pixel,
      function(feature) {
        return feature;
      });

  if (intersectingFeature) {
    var isSelected = false;

    if (this.features_ &&
        ol.array.includes(this.features_.getArray(), intersectingFeature)) {
      isSelected = true;
    }

    this.previousCursor_ = elem.style.cursor;

    // WebKit browsers don't support the grab icons without a prefix
    elem.style.cursor = this.lastCoordinate_ ?
        '-webkit-grabbing' : (isSelected ? '-webkit-grab' : 'pointer');

    // Thankfully, attempting to set the standard ones will silently fail,
    // keeping the prefixed icons
    elem.style.cursor = !this.lastCoordinate_ ?
        'grabbing' : (isSelected ? 'grab' : 'pointer');

  } else {
    elem.style.cursor = this.previousCursor_ !== undefined ?
        this.previousCursor_ : '';
    this.previousCursor_ = undefined;
  }
};

RemoveInteraction.prototype.featuresAtPixel_ = function(pixel, map) {
  var found = null;

  var intersectingFeature = map.forEachFeatureAtPixel(pixel,
      function(feature) {
        return feature;
      });

  if (this.features_ &&
      ol.array.includes(this.features_.getArray(), intersectingFeature)) {
    found = intersectingFeature;
  }

  return found;
};

moduke.exports = RemoveInteraction;
