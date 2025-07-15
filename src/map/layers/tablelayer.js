/**
 * @file ORIGINAL SOURCE: src/app/core/layers/tablelayer.js@v3.10.2
 * @since 3.11.0
 */
import G3WObject                        from 'g3w-object';

import { $promisify, promisify }        from 'utils/promisify';
import { getCatalogLayerById }          from 'utils/getCatalogLayerById';
import { XHR }                          from 'utils/XHR';
import { cloneDeep }                    from 'utils/cloneDeep';

import { Layer }                        from 'map/layers/layer';

/**
 * Base Layer that support editing
 */
export class TableLayer extends Layer {
  
  constructor(config = {}, opts = {}) {

    super(config, opts);

    /**
     * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
     */
    this.setters = [
      'addFeature',
      'updateFeature',
      'setFeatures',
      'setColor',
      'getFeatures',
      'commit',
    ];

    /**
     * EDITING API URL: /api/vector/<type of request: data/editing/config>/<project_type>/<project_id>/<layer_id>
     *
     * @example /api/vector/config/qdjango/10/points273849503023
     */
    this.type = Layer.LayerTypes.TABLE;

    /**
     * color
     */
    this._color = null;

    /**
     * @FIXME add description
     */
    this.layerId = config.id;

    /**
     * Feature wrapper (to store feature)
     * 
     * ORIGINAL SOURCE: g3w-client/src/map/layers/featuresstore.js@v4.0.0
     */
    this._featuresstore = Object.assign(new G3WObject, {
      _features: [],
      _loadedIds: [], // store features id load by current user
      _lockIds: [], // store locked features
      setters: [
        'addFeature',
        'removeFeature',
        'updateFeature',
        'clear',
        'commit',
        'featuresLockedByOtherUser',
      ],
      addFeatures(features = []) { features.forEach(f => this._features.push(f)) },
      addFeature(feature)        { this._features.push(feature); },
      removeFeature(feature)     { this._features = this._features.filter(f => feature.getUid() !== f.getUid()) },
      updateFeature(feature)     { this._features.find((feat, idx) => { if (feature.getUid() === feat.getUid() ) { this._features[idx] = feature; return true; } }); },
      clear()                    { this._features  = null; this._features  = []; this._lockIds   = []; this._loadedIds = []; },
      clone()                    { return cloneDeep(this); },
      getProvider:               () => this.getProvider('data'),
      getDataProvider:           () => this.getProvider('data'),
      unlock:                    () => $promisify(async () => await XHR.post({ url: this.getProvider('data')._layer.getUrl('unlock') })),
      getLockIds()               { return this._lockIds; },
      getFeatureById(id)         { return this._features.find(f => id == f.getId()); },
      setFeatures(features = []) { this._features = features; },
      readFeatures()             { return this._features; },
      featuresLockedByOtherUser(features = []) {},
      getFeatures: (opts = {}) => {
        return $promisify(async () => {
          if (this.getProvider('data')) {
            //call provider getFeatures to get features from server
            //get the feature base on response from server features, featurelockis etc ...
            const features = this._featuresstore._filterFeaturesResponse(await this.getProvider('data').getFeatures(opts));
            this._featuresstore.addFeatures(features);
            return features;
          }
          return this._featuresstore._features; // Get features stored. No call to server is done
        });
      },
      commit: (commitItems, featurestore)=> {
        return $promisify(async () => {
          if (commitItems && this.getProvider('data')) {
            commitItems.lockids = this._featuresstore._lockIds;
            return await XHR.post({
              url:         this.getProvider('data')._layer.getUrl('commit'),
              data:        JSON.stringify(commitItems),
              contentType: 'application/json',
            });
          }
          return Promise.reject();
        });
      },
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
      },

    }) 

  }

  /**
   * @since 4.0.0 
   */
  addFeature(feature)    { this._featuresstore.addFeature(feature); }

  /**
   * @TODO check if it unusued
   * 
   * @since 4.0.0
   */
  updateFeature(feature) { this._featuresstore.updateFeature(feature);}

  /**
   * @TODO check if it unusued
   * 
   * @since 4.0.0
   */
  setFeatures(features)  { this._featuresstore.setFeatures(features); }

  /**
   * @TODO check if it unusued
   * 
   * @since 4.0.0
   */
  setColor(color)        { this._color = color; }

  /**
   * get data from every sources (server, wms, etc..)
   * through provider related to featuresstore
   *
   * @param {*} opts
   * 
   * @since 4.0.0
   */
  getFeatures(opts = {}) {
    return $promisify(async () => {
      const features = await promisify(this._featuresstore.getFeatures(opts));
      this.emit('getFeatures', features);
      return features;
    });
  }

  /**
   * @since 4.0.0 
   */
  commit(commitItems) {
    return $promisify(async () => {
      const response = await promisify(this._featuresstore.commit(commitItems));
      // sync selection filter features
      if (response && response.result) {
        try {
          const layer = getCatalogLayerById(this.getId());
          //if layer has geometry
          if (layer.isGeoLayer()) {
            commitItems.update.forEach(({ id, geometry } = {}) => {
              if (layer.getOlSelectionFeature(id)) {
                const selected = layer.getOlSelectionFeature(id);
                if (selected) {
                  selected.feature = geometry;
                  GUI.getService('map').setSelectionFeatures('update', { feature: geometry });
                }
              }
            });
          }
          commitItems.delete.forEach(id => {
            if (layer.hasSelectionFid(id)) {
              layer.excludeSelectionFid(id);
            }
          })
        } catch(e) {
          console.warn(e);
        }
      }
      return response;
    });
  }

  clone() {
    return cloneDeep(this);
  }

  getColor() {
    return this._color;
  }

  readFeatures() {
    return this._featuresstore.readFeatures();
  }

  /**
   * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
   * @return {TableLayer}
   */
  getEditingLayer() {
    return this;
  }

  /**
   * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
   * Unlock editing features
   *
   * @returns jQuery Promise
   */
  unlock() {
    return $promisify(async () => await promisify(this._featuresstore.unlock()));
  }

  /**
   * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
   * @param { Boolean }  editable In case we want only editable fields
   * @returns layer fields
   */
  getEditingFields(editable = false) {
    return editable ? (this.config.editing.fields || []).filter(f => f.editable) : (this.config.editing.fields || []);
  }

  /**
   * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
   * @return {boolean}
   */
  isReady() {
    return this.state.editing.ready;
  };

  /**
   * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
   * @param bool
   */
  setReady(bool = false) {
    this.state.editing.ready = bool;
  }

  /**
   * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
   * @return {*}
   */
  getEditor() {
    return this._editor;
  }

  /**
   * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
   * @return {*}
   */
  isStarted() {
    return this._editor.isStarted()
  }

  getFeaturesStore() {
    return this._featuresstore;
  }

  setSource(source) {
    this._featuresstore = source;
  }

  getSource() {
    return this._featuresstore;
  }

  addFeatures(features = []) {
    features.forEach(f => this.addFeature(f));
  }
}