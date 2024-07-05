const { base, inherit } = require('utils');
const G3WObject = require('core/g3wobject');

/** @deprecated */
const _cloneDeep = require('lodash.clonedeep');

// Object to store and handle features of layer
function FeaturesStore(options={}) {
  this._features = options.features || [];
  this._provider = options.provider || null;
  this._loadedIds = []; // store locked ids
  this._lockIds = []; // store locked features
  //setters
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
     * setter to know when some features are locked
     */
    featuresLockedByOtherUser(features=[]) {},
  };

  base(this);
}

inherit(FeaturesStore, G3WObject);

const proto = FeaturesStore.prototype;

proto.clone = function() {
  return _cloneDeep(this);
};

proto.setProvider = function(provider) {
  this._provider = provider;
};

proto.getProvider = function() {
  return this._provider;
};

// method unlock features
proto.unlock = function() {
  const d = $.Deferred();
  this._provider.unlock()
    .then(response => {
      d.resolve(response)
    })
    .fail(err => d.reject(err));
  return d.promise();
};

// method get all features from server or attribute _features
proto._getFeatures = function(options={}) {
  const d = $.Deferred();
  if (this._provider) {
    //call provider getFeatures to get features from server
    this._provider.getFeatures(options)
      .then(options => {
        //get features base on response from server features, featurelockis etc ...
        const features = this._filterFeaturesResponse(options);
        this.addFeatures(features);
        d.resolve(features);
      })
      .fail(err => d.reject(err))
  } else {
    d.resolve(this._readFeatures());
  }
  return d.promise();
};

//filter features to add
proto._filterFeaturesResponse = function(options={}) {
  /**
   * get features returned from server and feature that are currently locked.
   * If featurelocks are less that a features, it means that other user is editing these feature
   * @type {*[]}
   */
  const {features=[], featurelocks=[]} = options;

  //if no features locks mean all feature request are locked by another user
  if (featurelocks.length === 0) {
    //if there are feature on response are locked
    if (features.length > 0) {
      this.featuresLockedByOtherUser(features);
    }
    return [];
  }

  this._filterLockIds(featurelocks);

  const lockFeatures = [];

  const featuresToAdd = features.filter(feature => {
    const featureId = feature.getId();
    if (featurelocks.find(({featureid}) => featureId == featureid)) {
      if (this._loadedIds.indexOf(featureId) === -1) {
        this._loadedIds.push(featureId);
        return true;
      }
    } else {
      lockFeatures.push(feature);
    }
  });

  //if count features
  if (featurelocks.length < features.length) {
    this.featuresLockedByOtherUser(lockFeatures);
  }

  return featuresToAdd;
};

/**
 *
 * @param featurelocks Array of lock feature locked by server fo a request
 * Element of array is
 * {
 *   featureid: Is current id of feature locked
 *   lockid: Is a server unique lock id  number
 * }
 * ex.
 * {featureid: "1", lockid: "6bbab1c1c03332fb39b8ffae35e557ba"}
 * @private
 */
proto._filterLockIds = function(featurelocks=[]) {
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

/**
 *
 * @returns {*|null|[]}
 * @private
 */
proto._readFeatures = function() {
  return this._features;
};

proto._commit = function(commitItems) {
  const d = $.Deferred();
  if (commitItems && this._provider) {
    commitItems.lockids = this._lockIds;
    this._provider.commit(commitItems)
      .then(response => d.resolve(response))
      .fail(err => d.reject(err))
  } else d.reject();
  return d.promise();
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

proto.setFeatures = function(features = []) {
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
