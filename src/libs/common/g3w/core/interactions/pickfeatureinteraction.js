var PickFeatureEventType = {
  PICKED: 'picked'
};

var PickFeatureEvent = function(type, coordinate, feature) {
  this.type = type;
  this.feature = feature;
  this.coordinate = coordinate;
};



var PickFeatureInteraction = function(options) {
  ol.interaction.Pointer.call(this, {
    handleDownEvent: PickFeatureInteraction.handleDownEvent_,
    handleUpEvent: PickFeatureInteraction.handleUpEvent_,
    handleMoveEvent: PickFeatureInteraction.handleMoveEvent_,
  });
  
  this.features_ = options.features || null;
  
  this.layers_ = options.layers || null;
  
  this.pickedFeature_ = null;
  
  var self = this;
  this.layerFilter_ = function(layer) {
    return _.includes(self.layers_, layer);
  };
};
ol.inherits(PickFeatureInteraction, ol.interaction.Pointer);

PickFeatureInteraction.handleDownEvent_ = function(event) {
  this.pickedFeature_ = this.featuresAtPixel_(event.pixel, event.map);
  return true;
};

PickFeatureInteraction.handleUpEvent_ = function(event) {
  if(this.pickedFeature_){
    this.dispatchEvent(
            new PickFeatureEvent(
                PickFeatureEventType.PICKED,
                event.coordinate,
                this.pickedFeature_));
  }
  return true;
};

PickFeatureInteraction.handleMoveEvent_ = function(event) {
  var elem = event.map.getTargetElement();
  var intersectingFeature = this.featuresAtPixel_(event.pixel, event.map);

  if (intersectingFeature) {
    elem.style.cursor =  'pointer';
  } else {
    elem.style.cursor = '';
  }
};

PickFeatureInteraction.prototype.featuresAtPixel_ = function(pixel, map) {
  var found = null;

  var intersectingFeature = map.forEachFeatureAtPixel(pixel,
      function(feature) {
        if (this.features_) {
          if (this.features_.indexOf(feature) > -1){
            return feature
          }
          else{
            return null;
          }
        }
        return feature;
      },this,this.layerFilter_);
  
  if(intersectingFeature){
    found = intersectingFeature;
  }
  return found;
};

PickFeatureInteraction.prototype.shouldStopEvent = function(){
  return false;
};

PickFeatureInteraction.prototype.setMap = function(map){
  if (!map) {
    var elem = this.getMap().getTargetElement();
    elem.style.cursor = '';
  }
  ol.interaction.Pointer.prototype.setMap.call(this,map);
};

module.exports = PickFeatureInteraction;
