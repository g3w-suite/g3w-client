/**
 * @TODO Check if it used otherwise delete it
 *
 * @type {DeleteInteraction}
 */
module.exports = class DeleteInteraction extends ol.interaction.Pointer {
  constructor(opts = {}) {
    super({
      handleDownEvent(e) {
        this.lastFeature_ = this.featuresAtPixel_(e.pixel, e.map);
        if (this.lastFeature_) {
          this.handleMoveEvent(e);
          this.dispatchEvent({
            type:       'deleteend',
            layer:      this.layer_,
            features:   this.features_,
            coordinate: e.coordinate,
          })

          return true;
        }
        return false;
      },
      handleMoveEvent(e) {
        this.map_  = e.map;
        const elem = this.map_.getTargetElement();
        if (undefined === this.startCursor_) { this.startCursor_ = elem.style.cursor }
        const intersectingFeature = this.map_.forEachFeatureAtPixel(e.pixel, (feature, layer) =>  {
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
      },
      handleUpEvent(e) {},
      handleEvent(mapBrowserEvent) {
        if ('keydown' == mapBrowserEvent.type ){
          if (this.features_.getArray().length > 0 && 46 == mapBrowserEvent.originalEvent.keyCode) {
            // an event can be string or an object with an attribute type
            this.dispatchEvent(this.dispatchEvent({
              type:       'deleteend',
              layer:      this.layer_,
              features:   this.features_,
              coordinate: e.coordinate,
            }));
            return true;
          }
        }
        else { return super.handleEvent(mapBrowserEvent) }
      }
    });

    this.previousCursor_ = undefined;
    this.startCursor_    = undefined;
    this.lastCoordinate_ = null;
    this.features_       = undefined !== opts.features ? opts.features : null;
    this.layer_          = undefined !== opts.layer ? opts.layer : null;
    this.map_            = null;
  }

  featuresAtPixel_(pixel, map) {
    let found = null;
    const intersectingFeature = map.forEachFeatureAtPixel(pixel, feature => feature);
    if (this.features_ && this.features_.getArray().includes(intersectingFeature)) {
      found = intersectingFeature;
    }
    return found;
  }

  clear() {
    let elem;
    if (this.map_) {
      elem = this.map_.getTargetElement();
      elem.style.cursor = this.startCursor_;
    }
  }
};
