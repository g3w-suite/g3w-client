const { base, inherit } = require('core/utils/utils');
const G3WObject = require('core/g3wobject');

// Object to store and handle features of layer
function FeaturesStore(options={}) {
  this._features = options.features || [];
  this._provider = options.provider || null;
  this._loadedIds = []; // store locked ids
  this._lockIds = []; // store locked features
  this.hasFeatureLockByOtherUser = false; // property tath i set to true if some feature are locked by other user
  this.setters = {
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
    getFeatures(options={}) {
      return this._getFeatures(options);
    },
    commit(commitItems, featurestore) {
      return this._commit(commitItems, featurestore);
    },
    /**
     * setter to know when some feature are locked
     */
    featuresLockedByOtherUser(){
      //set to true
      this.hasFeatureLockByOtherUser = true;
    }
  };

  base(this);
}

inherit(FeaturesStore, G3WObject);

const proto = FeaturesStore.prototype;

proto.clone = function() {
  return _.cloneDeep(this);
};

proto.setProvider = function(provider) {
  this._provider = provider;
};

proto.getProvider = function() {
  return this._provider;
};

// method unlock features
proto.unlock = function() {
  return new Promise((resolve, reject) => {
    this._provider.unlock()
      .then(response => {
        // set to false when featuresstore is unlocked
        this.hasFeatureLockByOtherUser = false;
        resolve(response)
      })
      .fail(err => reject(err));
  })
};

// method get all features from server or attribute _features
proto._getFeatures = function(options={}) {
  return new Promise((resolve, reject) => {
    if (this._provider) {
      this._provider.getFeatures(options)
        .then(options => {
          const features = this._filterFeaturesResponse(options);
          this.addFeatures(features);
          resolve(features);
        })
        .fail(err => reject(err))
    } else resolve(this._readFeatures());
  })
};

//filter features to add
proto._filterFeaturesResponse = function(options={}) {
  /**
   * get features returned from server and feature that are current locked.
   * If featurelocks are less that a features, it means that other user is editing these feature
   * @type {*[]}
   */
  const {features=[], featurelocks=[], count} = options;
  const featuresToAdd = features.filter(feature => {
    const featureId = feature.getId();
    const added = this._loadedIds.indexOf(featureId) !== -1;
    if (!added) this._loadedIds.push(featureId);
    return !added
  });
  this._filterLockIds(featurelocks);
  if (features.length < count && !this.hasFeatureLockByOtherUser) this.featuresLockedByOtherUser();
  return featuresToAdd;
};

// method get features locked
proto._filterLockIds = function(featurelocks) {
  const _lockIds = this._lockIds.map(lockid => lockid.featureid);
  const toAddLockId = featurelocks.filter(featurelock => _lockIds.indexOf(featurelock.featureid) === -1);
  this._lockIds = [...this._lockIds, ...toAddLockId];
};

proto.addLoadedIds = function(id) {
  this._loadedIds.push(id);
};

proto.getLockIds = function() {
  return this._lockIds;
};

//method to add new lockid
proto.addLockIds = function(lockIds) {
  this._lockIds = _.union(this._lockIds, lockIds);
  this._lockIds.forEach(lockId => this._loadedIds.push(lockId.featureid));
};

proto._readFeatures = function() {
  return this._features;
};

proto._commit = function(commitItems) {
  return new Promise((resolve, reject) => {
    if (commitItems && this._provider) {
      commitItems.lockids = this._lockIds;
      this._provider.commit(commitItems)
        .then(response => resolve(response))
        .fail(err => reject(err))
    } else reject();
  })
};

// get feature from id
proto.getFeatureById = function(featureId) {
  return this._features.find(feature => feature.getId() == featureId);
};

proto.getFeatureByUid = function(uid) {
  return this._features.find(feature => feature.getUid() === uid);
};

proto._addFeature = function(feature) {
  this._features.push(feature);
};

//substitute feature after update
proto._updateFeature = function(feature) {
  this._features.find((feat, idx) => {
    if (feat.getUid() === feature.getUid()) {
      this._features[idx] = feature;
      return true;
    }
  });
};

proto.setFeatures = function(features) {
  this._features = features;
};

proto._removeFeature = function(feature) {
  this._features = this._features.filter(feat => feature.getUid() !== feat.getUid());
};

proto._clearFeatures = function() {
  this._features = null;
  this._features = [];
  this._lockIds = [];
  this._loadedIds = [];
};

proto.getDataProvider = function() {
  return this._provider;
};

// only read downloaded features
proto.readFeatures = function() {
  return this._features;
};

module.exports = FeaturesStore;
