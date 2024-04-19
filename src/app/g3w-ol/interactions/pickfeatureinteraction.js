const PickFeatureEventType = { PICKED: 'picked' };

const PickFeatureEvent = function(type, coordinate, layer, feature) {
  this.type       = type;
  this.feature    = feature;
  this.coordinate = coordinate;
  this.layer      = layer;
};

const PickFeatureInteraction = function(options = {}) {
  ol.interaction.Pointer.call(this, {
    handleDownEvent: PickFeatureInteraction.handleDownEvent_,
    handleUpEvent:   PickFeatureInteraction.handleUpEvent_,
    handleMoveEvent: PickFeatureInteraction.handleMoveEvent_
  });
  const { features } = options;
  this.features_      = Array.isArray(features) && features.length && features || null;
  this.layers_        = options.layers || null;
  this.pickedFeature_ = null;
  this.pickedLayer_   = null;
  this.layerFilter_   = layer => {
    const include = this.layers_.includes(layer);
    this.pickedLayer_ = include && layer;
    return include;
  };
};
ol.inherits(PickFeatureInteraction, ol.interaction.Pointer);

PickFeatureInteraction.handleDownEvent_ = function(e) {
  this.pickedFeature_ = this.featuresAtPixel_(e.pixel, e.map);
  return this.pickedFeature_;
};

PickFeatureInteraction.handleUpEvent_ = function(e) {
  if (this.pickedFeature_) {
    this.dispatchEvent(
      new PickFeatureEvent(
        PickFeatureEventType.PICKED,
        e.coordinate,
        this.pickedLayer_,
        this.pickedFeature_)
    );
  }
  return true;
};

PickFeatureInteraction.handleMoveEvent_ = function(e) {
  const intersectingFeature = this.featuresAtPixel_(e.pixel, e.map);
  e.map.getTargetElement().style.cursor = intersectingFeature ? 'pointer': '';
};

PickFeatureInteraction.prototype.featuresAtPixel_ = function(pixel, map) {
  let featureFound = null;
  const intersectingFeature = map.forEachFeatureAtPixel(pixel, feature => {
    if (this.features_) {
      if (this.features_.indexOf(feature) > -1) { return feature }
      else { return null }
    }
    return feature;
  }, {
    layerFilter:  this.layerFilter_,
    hitTolerance: (isMobile && isMobile.any) ? 10 : 0
  });
  if (intersectingFeature) { featureFound = intersectingFeature }
  return featureFound;
};

PickFeatureInteraction.prototype.shouldStopEvent = function() {
  return false;
};

PickFeatureInteraction.prototype.setMap = function(map) {
  if (!map) { this.getMap().getTargetElement().style.cursor = ''}
  ol.interaction.Pointer.prototype.setMap.call(this,map);
};

module.exports = PickFeatureInteraction;
