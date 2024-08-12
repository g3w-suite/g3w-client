const FeaturesStore     = require('core/layers/features/featuresstore');

module.exports = class OlFeaturesStore extends FeaturesStore {
  constructor(opts = {}) {
    super(opts);
    this._features = opts.features || new ol.Collection([]);
  }

  getLength() {
    return this._features.getLength();
  }

  //overwrite
  setFeatures(features = []) {
    //remove features
    this._features.clear();
    //add new features
    this.addFeatures(features);
    this._features.dispatchEvent('change');
  };
// overwrite
  readFeatures() {
    return this._features.getArray();
  };

  getFeaturesCollection() {
    return this._features;
  }

  getFeatureById(featureId) {
    return this._features.getArray().find(f => featureId == f.getId());
  }

  getFeatureByUid(uid) {
    return this._features.getArray().find(f => uid === f.getUid());
  }

  _addFeature(feature) {
    this._features.push(feature);
    // useful for ol.source.Vector
    this._features.dispatchEvent('change')
  }

//substitute the feature after modifying
  _updateFeature(feature) {
    // set index at -1
    let index = -1;
    const featuresArray = this._features.getArray();
    for (let i = 0; featuresArray.length; i++) {
      const _feature = featuresArray[i];
      if (_feature.getUid() === feature.getUid()) {
        index = i;
        break;
      }
    }
    if (index >=0) {
      this._features.removeAt(index);
      this._features.insertAt(index, feature);
      this._features.dispatchEvent('change')
    }
  }

// remove feature from store
  _removeFeature(feature) {
    const featuresArray = this._features.getArray();
    for (let i = 0; i < featuresArray.length; i++) {
      const feat = featuresArray[i];
      if (feature.getUid() === feat.getUid()) {
        this._features.removeAt(i);
        break;
      }
    }
    this._features.dispatchEvent('change');
  }


  _clearFeatures() {
    try {
      this._features.clear();
    } catch(e) {
      console.warn(e);
    }
    this._features = null;
    this._features = new ol.Collection([]);
  }

}
