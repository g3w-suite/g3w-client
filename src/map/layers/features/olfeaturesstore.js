/**
 * @file ORIGINAL SOURCE: src/app/core/layers/features/olfeaturestore.js@v3.10.2
 * @since 3.11.0
 */

const FeaturesStore     = require('map/layers/features/featuresstore');

module.exports = class OlFeaturesStore extends FeaturesStore {
  constructor(opts = {}) {
    super(opts);
    this._features = opts.features || new ol.Collection([]);
  }

  /**
   * Get number of features stored
   * @return { Number }
   */
  getLength() {
    return this._features.getLength();
  }

  /**
   * Store features
   * @param { Array } features
   */
  setFeatures(features = []) {
    //remove features
    this._features.clear();
    //add new features
    this.addFeatures(features);
    this._features.dispatchEvent('change');
  };

  /**
   *
   * @return {*[]}
   */
  readFeatures() {
    return this._features.getArray();
  };

  /**
   *
   * @return {*|ol.Collection}
   */
  getFeaturesCollection() {
    return this._features;
  }

  /**
   *
   * @param id
   * @return {*}
   */
  getFeatureById(id) {
    return this._features.getArray().find(f => id == f.getId());
  }

  getFeatureByUid(uid) {
    return this._features.getArray().find(f => uid === f.getUid());
  }

  /**
   *
   * @param feature
   * @private
   */
  _addFeature(feature) {
    this._features.push(feature);
    // useful for ol.source.Vector
    this._features.dispatchEvent('change');
  }

  /**
   * Substitute the feature after modifying
   * @param feature
   * @private
   */
  _updateFeature(feature) {
    const index = this._features.getArray().findIndex(f => feature.getUid() === f.getUid());
    if (index >= 0) {
      this._features.removeAt(index);
      this._features.insertAt(index, feature);
      this._features.dispatchEvent('change')
    }
  }

  /**
   * Remove feature from store
   * @param feature
   * @private
   */
  _removeFeature(feature) {
    const index = this._features.getArray().findIndex(f => feature.getUid() === f.getUid());
    if (index >= 0) {
      this._features.removeAt(index);
      this._features.dispatchEvent('change');
    }
  }

  /**
   *
   * @private
   */
  _clearFeatures() {
    try {
      // Used remove single features instead use clear method
      // because some time trows an error
      for (let i = 0; i < this._features.getArray().length; i++) {
        this._features.removeAt(i);
      }
    } catch(e) {
      console.warn(e);
    }
    //Need to set a new Collection to avoid duplicate
    this._features = null; //@TODO is still usefully ????
    this._features = new ol.Collection([]);
  }

}
