import Collection from 'ol/Collection';
import FeaturesStore from './featuresstore';

// Storage of the feature in vector layer
class OlFeaturesStore extends FeaturesStore {
  constructor(options = {}) {
    super(options);
    this._features = options.features || new Collection([]);
  }

  getLength() {
    return this._features.getLength();
  }

  // overwrite
  setFeatures(features = []) {
    features.forEach((feature) => this._features.push(feature));
  }

  // overwrite
  readFeatures() {
    return this._features.getArray();
  }

  getFeaturesCollection() {
    return this._features;
  }

  getFeatureById(featureId) {
    return this._features.getArray().find((feature) => feature.getId() == featureId);
  }

  getFeatureByUid(uid) {
    return this._features.getArray().find((feature) => feature.getUid() === uid);
  }

  _addFeature(feature) {
    this._features.push(feature);
    // useful for ol.source.Vector
    this._features.dispatchEvent('change');
  }

  // substitute the feature after modify
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
    if (index >= 0) {
      this._features.removeAt(index);
      this._features.insertAt(index, feature);
      this._features.dispatchEvent('change');
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
    } catch (err) {}
    this._features = null;
    this._features = new Collection([]);
  }
}

export default OlFeaturesStore;
