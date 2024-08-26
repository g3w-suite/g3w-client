import { $promisify  } from 'utils/promisify';

const G3WObject         = require('core/g3wobject');

/** @deprecated */
const _cloneDeep        = require('lodash.clonedeep');

module.exports = class FeaturesStore extends G3WObject {
  constructor(opts = {}) {
    super();
    this._features  = opts.features || [];
    this._provider  = opts.provider || null;
    this._loadedIds = []; // store features id load by current user
    this._lockIds   = []; // store locked features
    //setters
    this.setters    = {
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
    }
  }
  clone() {
    return _cloneDeep(this);
  }

  setProvider(provider) {
    this._provider = provider;
  }

  getProvider() {
    return this._provider;
  }

  // method unlock features
  unlock() {
    return $promisify(new Promise((resolve, reject) => {
      this._provider.unlock()
        .then(response => resolve(response))
        .fail(e => { console.warn(e); reject(e) });
    }))
  }

  /*
   * Gets all features from server or attribute _features
   */
  _getFeatures(options = {}) {
    return $promisify(new Promise((resolve, reject) => {
      if (this._provider) {
        //call provider getFeatures to get features from server
        this._provider.getFeatures(options)
          .then(options => {
            //get the feature base on response from server features, featurelockis etc ...
            const features = this._filterFeaturesResponse(options);
            this.addFeatures(features);
            resolve(features);
          })
          .fail(e => { console.warn(e); reject(e) })
      } else {
        resolve(this._readFeatures());
      }
    }))

  }

  /**
   * Filter features to add
   * @param options
   * @private
   * @return Array of features to add
   */
  _filterFeaturesResponse(options = {}) {
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

  getLockIds() {
    return this._lockIds;
  }

//method to add new lockid
  addLockIds(lockIds) {
    this._lockIds = _.union(this._lockIds, lockIds);
    this._lockIds.forEach(({ featureid }) => this._loadedIds.push(featureid));
  }

  /**
   *
   * @returns {*|null|[]}
   * @private
   */
  _readFeatures() {
    return this._features;
  }

  _commit(commitItems) {
    return $promisify(new Promise((resolve, reject) => {
      if (commitItems && this._provider) {
        commitItems.lockids = this._lockIds;
        this._provider
          .commit(commitItems)
          .then(response => resolve(response))
          .fail(e => { console.warn(e); reject(e) })
      } else {
        reject();
      }
    }))
  }

// get feature from id
  getFeatureById(featureId) {
    return this._features.find(f => featureId == f.getId());
  }

  getFeatureByUid(uid) {
    return this._features.find(f => uid === f.getUid());
  }

  _addFeature(feature) {
    this._features.push(feature);
  }

//substitute feature after update
  _updateFeature(feature) {
    this._features.find((feat, idx) => {
      if (feature.getUid() === feat.getUid() ) {
        this._features[idx] = feature;
        return true;
      }
    });
  }

  setFeatures(features = []) {
    this._features = features;
  }

  _removeFeature(feature) {
    this._features = this._features.filter(f => feature.getUid() !== f.getUid());
  }

  _clearFeatures() {
    this._features  = null;
    this._features  = [];
    this._lockIds   = [];
    this._loadedIds = [];
  }

  getDataProvider() {
    return this._provider;
  }

// only read downloaded features
  readFeatures() {
    return this._features;
  }

}

