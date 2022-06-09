import {Pointer} from "ol/interaction";

const PickFeatureEventType = {
  PICKED: 'picked'
};

const PickFeatureEvent = function(type, coordinate, layer, feature) {
  this.type = type;
  this.feature = feature;
  this.coordinate = coordinate;
  this.layer = layer;
};

class PickFeatureInteraction extends Pointer {
  constructor(options={}) {
    const {features} = options;
    super( {
      handleDownEvent: PickFeatureInteraction.handleDownEvent_,
      handleUpEvent: PickFeatureInteraction.handleUpEvent_,
      handleMoveEvent: PickFeatureInteraction.handleMoveEvent_
    });
    this.features_ = Array.isArray(features) && features.length && features || null;
    this.layers_ = options.layers || [];
    this.pickedFeature_ = null;
    this.pickedLayer_ = null;
    this.layerFilter_ = layer =>  {
      const include = _.includes(this.layers_, layer);
      this.pickedLayer_ = include && layer;
      return include;
    };
  }

  handleDownEvent_(event) {
    this.pickedFeature_ = this.featuresAtPixel_(event.pixel, event.map);
    return this.pickedFeature_;
  };

  handleUpEvent_(event) {
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

  handleMoveEvent_(event) {
    const elem = event.map.getTargetElement();
    const intersectingFeature = this.featuresAtPixel_(event.pixel, event.map);
    elem.style.cursor = intersectingFeature ?  'pointer': '';
  };

  featuresAtPixel_(pixel, map) {
    let featureFound = null;
    const intersectingFeature = map.forEachFeatureAtPixel(pixel, feature => {
      if (this.features_) {
        if (this.features_.indexOf(feature) > -1) return feature;
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

  shouldStopEvent(){
    return false;
  };

  setMap(map){
    if (!map) {
      const elem = this.getMap().getTargetElement();
      elem.style.cursor = '';
    }
    super.setMap(map);
  };

}

export default  PickFeatureInteraction;
