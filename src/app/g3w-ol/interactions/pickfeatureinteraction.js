module.exports = class PickFeatureInteraction extends ol.interaction.Pointer {
  constructor(opts = {}) {
    super({
      handleDownEvent(e) {
        this.pickedFeature_ = this.featuresAtPixel_(e.pixel, e.map);
        return this.pickedFeature_;
      },
      handleUpEvent(e) {
        if (this.pickedFeature_) {
          this.dispatchEvent({
            type:       'picked',
            feature:    this.pickedFeature_,
            coordinate: e.coordinate,
            layer:      this.pickedLayer_,
          })
        }
        return true;
      },
      handleMoveEvent(e) {
        e.map.getTargetElement().style.cursor = this.featuresAtPixel_(e.pixel, e.map) ? 'pointer': '';
      },
      ...opts
    })

    const { features } = opts;
    this.features_      = (Array.isArray(features) && features.length > 0) ? features : null;
    this.layers_        = opts.layers || null;
    this.pickedFeature_ = null;
    this.pickedLayer_   = null;
  }

  layerFilter_(layer) {
    const include     = this.layers_.includes(layer);
    this.pickedLayer_ = include && layer;
    return include;
  }

  featuresAtPixel_(pixel, map) {
    let featureFound = null;
    const intersectingFeature = map.forEachFeatureAtPixel(pixel, feature => {
      if (this.features_) {
        if (this.features_.includes(feature)) { return feature }
        else { return null }
      }
      return feature;
    }, {
      layerFilter:  this.layerFilter_,
      hitTolerance: (isMobile && isMobile.any) ? 10 : 0
    });
    if (intersectingFeature) { featureFound = intersectingFeature }
    return featureFound;
  }

  shouldStopEvent() { return false }

  setMap(map) {
    if (!map) { this.getMap().getTargetElement().style.cursor = ''}
    super.setMap(map);
  }
};
