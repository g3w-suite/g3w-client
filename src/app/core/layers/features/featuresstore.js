const { base, inherit } = require('utils');
const G3WObject         = require('core/g3wobject');

/** @deprecated */
const _cloneDeep        = require('lodash.clonedeep');

// Object to store and handle features of layer
function FeaturesStore(options = {}) {
  this._features  = options.features || [];
  this._provider  = options.provider || null;
  this._loadedIds = []; // store features id load by current user
  this._lockIds   = []; // store locked features
  //setters
  this.setters = {
    addFeatures(features = []) {
      features.forEach(f => this._addFeature(f))
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
    /**
     *
     * @param commitItems
     * @param featurestore Its is used????
     * @return {*}
     */
    commit(commitItems, featurestore) {
      return this._commit(commitItems, featurestore);
    },
    /**
     * setter to know when some features are locked
     */
    featuresLockedByOtherUser(features = []) {},
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
    .then(response => d.resolve(response))
    .fail(e => { console.warn(e); d.reject(e) });
  return d.promise();
};

/*
 * Gets all features from server or attribute _features
 */
proto._getFeatures = function(options = {}) {
  const d = $.Deferred();
  if (this._provider) {
    //call provider getFeatures to get features from server
    this._provider.getFeatures(options)
      .then(options => {
        //get the features base on response from server features, featurelockis etc ...
        const features = this._filterFeaturesResponse(options);
        this.addFeatures(features);
        d.resolve(features);
      })
      .fail(e => { console.warn(e); d.reject(e) })
  } else {
    d.resolve(this._readFeatures());
  }
  return d.promise();
};

/**
 * Filter features to add
 * @param options
 * @private
 * @return Array of features to add
 */
proto._filterFeaturesResponse = function(options = {}) {
  /**
   * features uis array of feature returned from server and feature that are currently locked.
   * featurelocks is array of the feature that can be locker by current client request (not locked by another user)
   * featurelocks array item
   * {
   *   featureid: Is current id of feature locked
   *   lockid: Is a server unique lock id number
   * }
   * ex.
   * {featureid: "1", lockid: "6bbab1c1c03332fb39b8ffae35e557ba"}
   *
   * If featurelocks are less than features, it means that another user is editing these features
   *
   *
   * @type {*[]}
   */
  const { features = [], featurelocks = [] } = options;

  //if no features locks mean another user locks all feature requests
  if (0 === featurelocks.length) {
    //if there are features on response
    if (features.length > 0) {
      //It means that another user locks these features
      this.featuresLockedByOtherUser(features);
    }
    return [];
  }

  //get already loaded feature id locked by current user
  const fids = this._lockIds.map(({ featureid }) => featureid);
  featurelocks
    .filter(({ featureid }) => !fids.includes(featureid)) //exclude features already locked by current user
    .forEach(fl => this._lockIds.push(fl)) //update lockIds based on a featurelocks array from response

  //store features locked by another user
  const lockFeatures = [];

  //Store features to add to layers source
  const featuresToAdd = features.filter(f => {
    //get feature id
    const featureId = f.getId();
    //check if feature id is locked features
    //it means that is not locked by another user.
    if (featurelocks.find(({ featureid }) => featureId == featureid)) {
      //check if feature is not yet added for the current user
      if (this._loadedIds.indexOf(featureId) === -1) {
        this._loadedIds.push(featureId);
        return true;
      } else {
        return false; //feature locked by the current user
      }
    } else {
      lockFeatures.push(f);
      return false; //feature locked by another user
    }
  });

  //if features locks are less than features get from server,
  // it means that another user locks some features
  if (featurelocks.length < features.length) {
    this.featuresLockedByOtherUser(lockFeatures);
  }

  return featuresToAdd;
}

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
    this._provider
      .commit(commitItems)
      .then(response => d.resolve(response))
      .fail(e => { console.warn(e); d.reject(e) })
  } else {
    d.reject();
  }
  return d.promise();
};

// get feature from id
proto.getFeatureById = function(featureId) {
  return this._features.find(f => featureId == f.getId());
};

proto.getFeatureByUid = function(uid) {
  return this._features.find(f => uid === f.getUid());
};

proto._addFeature = function(feature) {
  this._features.push(feature);
};

//substitute feature after update
proto._updateFeature = function(feature) {
  this._features.find((feat, idx) => {
    if (feature.getUid() === feat.getUid() ) {
      this._features[idx] = feature;
      return true;
    }
  });
};

proto.setFeatures = function(features = []) {
  this._features = features;
};

proto._removeFeature = function(feature) {
  this._features = this._features.filter(f => feature.getUid() !== f.getUid());
};

proto._clearFeatures = function() {
  this._features  = null;
  this._features  = [];
  this._lockIds   = [];
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
