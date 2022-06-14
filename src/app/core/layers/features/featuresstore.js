import G3WObject from 'core/g3wobject';

// Class to store and handle features of layer
class FeaturesStore extends G3WObject {
  constructor(options={}) {
    super({
      setters: {
        addFeatures(features) {
          features.forEach(feature => {
            this._addFeature(feature);
          })
        },
        addFeature(feature) {
          this._addFeature(feature);
        },
        removeFeature(feature) {
          this._removeFeature(feature);
        },
        updateFeature(feature) {
          this._updateFeature(feature);
        },
        clear() {
          this._clearFeatures();
        },
        getFeatures(options = {}) {
          return this._getFeatures(options);
        },
        commit(commitItems, featurestore) {
          return this._commit(commitItems, featurestore);
        }
      }
    });

    const {features=[], provider=null} = options;
    this._features = features;
    this._provider = provider;
    this._loadedIds = []; // store loeckedids
    this._lockIds = []; // store locked features
  };
  clone() {
    return _.cloneDeep(this);
  };

  setProvider(provider) {
    this._provider = provider;
  };

  getProvider() {
    return this._provider;
  };

  // method unlock features
  unlock() {
    const d = $.Deferred();
    this._provider.unlock()
      .then(response=> d.resolve(response))
      .fail(err => d.reject(err));
    return d.promise();
  };

  // method get all features from server or attribute _features
  _getFeatures(options={}) {
    const d = $.Deferred();
    if (this._provider) {
      this._provider.getFeatures(options)
        .then(options => {
          const features = this._filterFeaturesResponse(options);
          this.addFeatures(features);
          d.resolve(features);
        })
        .fail(err => d.reject(err))
    } else d.resolve(this._readFeatures());
    return d.promise();
  };

    //filter features to add
  _filterFeaturesResponse(options={}) {
    const {features=[], featurelocks=[]} = options;
    const featuresToAdd = features.filter(feature => {
      const featureId = feature.getId();
      const added = this._loadedIds.indexOf(featureId) !== -1;
      if (!added) this._loadedIds.push(featureId);
      return !added
    });
    this._filterLockIds(featurelocks);
    return featuresToAdd;
  };

  // method cget fetaures locked
  _filterLockIds(featurelocks) {
    const _lockIds = this._lockIds.map((lockid) => {
      return lockid.featureid;
    });
    const toAddLockId = featurelocks.filter((featurelock) => {
      return _lockIds.indexOf(featurelock.featureid) === -1;
    });
    this._lockIds = [...this._lockIds, ...toAddLockId];
  };

  addLoadedIds(id) {
    this._loadedIds.push(id);
  };

  getLockIds() {
    return this._lockIds;
  };

//method to add new lockid
  addLockIds(lockIds) {
    this._lockIds = _.union(this._lockIds, lockIds);
    this._lockIds.forEach(lockId => this._loadedIds.push(lockId.featureid));
  };

  _readFeatures() {
    return this._features;
  };

  _commit(commitItems) {
    const d = $.Deferred();
    if (commitItems && this._provider) {
      commitItems.lockids = this._lockIds;
      this._provider.commit(commitItems)
        .then(response => d.resolve(response))
        .fail(err => d.reject(err))
    } else {
      d.reject();
    }
    return d.promise();
  };

  // get feature from id
  getFeatureById(featureId) {
    return this._features.find((feature) => feature.getId() == featureId);
  };

  getFeatureByUid(uid) {
    return this._features.find((feature) => feature.getUid() === uid);
  };

  _addFeature(feature) {
    this._features.push(feature);
  };

  //substitute feature after update
  _updateFeature(feature) {
    this._features.find((feat, idx) => {
      if (feat.getUid() === feature.getUid()) {
        this._features[idx] = feature;
        return true;
      }
    });
  };

  setFeatures(features) {
    this._features = features;
  };

  _removeFeature(feature) {
    this._features = this._features.filter((feat) => {
      return feature.getUid() !== feat.getUid();
    })
  };

  _clearFeatures() {
    this._features = null;
    this._features = [];
    this._lockIds = [];
    this._loadedIds = [];
  };

  getDataProvider() {
    return this._provider;
  };

  // only read downloaded features
  readFeatures() {
    return this._features;
  };
}





export default  FeaturesStore;
