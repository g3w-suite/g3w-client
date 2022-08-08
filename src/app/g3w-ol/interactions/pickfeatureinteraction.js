const PickFeatureEventType = {
  PICKED: 'picked'
};

const PickFeatureEvent = function(type, coordinate, layer, feature) {
  this.type = type;
  this.feature = feature;
  this.coordinate = coordinate;
  this.layer = layer;
};

const PickFeatureInteraction = function(options={}) {
  ol.interaction.Pointer.call(this, {
    handleDownEvent: PickFeatureInteraction.handleDownEvent_,
    handleUpEvent: PickFeatureInteraction.handleUpEvent_,
    handleMoveEvent: PickFeatureInteraction.handleMoveEvent_
  });
  const {features} = options;
  this.features_ = Array.isArray(features) && features.length && features || null;
  this.layers_ = options.layers || null;
  this.pickedFeature_ = null;
  this.pickedLayer_ = null;
  this.layerFilter_ = (layer) =>  {
    const include = _.includes(this.layers_, layer);
    this.pickedLayer_ = include && layer;
    return include;
  };
};
ol.inherits(PickFeatureInteraction, ol.interaction.Pointer);

PickFeatureInteraction.handleDownEvent_ = function(event) {
  this.pickedFeature_ = this.featuresAtPixel_(event.pixel, event.map);
  return this.pickedFeature_;
};

PickFeatureInteraction.handleUpEvent_ = function(event) {
  if(this.pickedFeature_){
    this.dispatchEvent(
      new PickFeatureEvent(
        PickFeatureEventType.PICKED,
        event.coordinate,
        this.pickedLayer_,
        this.pickedFeature_)
    );
  }
  return true;
};

PickFeatureInteraction.handleMoveEvent_ = function(event) {
  const elem = event.map.getTargetElement();
  const intersectingFeature = this.featuresAtPixel_(event.pixel, event.map);
  elem.style.cursor = intersectingFeature ?  'pointer': '';
};

PickFeatureInteraction.prototype.featuresAtPixel_ = function(pixel, map) {
  let featureFound = null;
  const intersectingFeature = map.forEachFeatureAtPixel(pixel, (feature) => {
        if (this.features_) {
          if (this.features_.indexOf(feature) > -1)return feature
          else return null;
        }
        return feature;
      }, {
        layerFilter: this.layerFilter_,
        hitTolerance: (isMobile && isMobile.any) ? 10 : 0
      });
  if (intersectingFeature) featureFound = intersectingFeature;
  return featureFound;
};

PickFeatureInteraction.prototype.shouldStopEvent = function(){
  return false;
};

PickFeatureInteraction.prototype.setMap = function(map){
  if (!map) {
    const elem = this.getMap().getTargetElement();
    elem.style.cursor = '';
  }
  ol.interaction.Pointer.prototype.setMap.call(this,map);
};

module.exports = PickFeatureInteraction;
