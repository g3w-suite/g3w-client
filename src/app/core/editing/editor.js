import Applicationstate                   from 'store/application-state';
import ChangesManager                     from 'services/editing';
import SessionsRegistry                   from 'store/sessions';
import DataRouterService                  from 'services/data';
import RelationsService                   from 'services/relations';

const { inherit, base }                   = require('core/utils/utils');
const { createFeaturesFromVectorDataApi } = require('core/utils/geo');
const G3WObject                           = require('core/g3wobject');
const FeaturesStore                       = require('core/layers/features/featuresstore');
const OlFeaturesStore                     = require('core/layers/features/olfeaturesstore');
const Layer                               = require('core/layers/layer');
const Feature                             = require('core/layers/features/feature');

/**
 * Editor Class: bind editor to layer to do main actions
 *
 * @param config
 *
 * @constructor
 */
function Editor(options = {}) {

  /**
   * Setter hooks.
   */
  this.setters = {
    save:          this._save,
    addFeature:    this._addFeature,
    updateFeature: this._updateFeature,
    deleteFeature: this._deleteFeature,
    setFeatures:   this._setFeatures,
    getFeatures:   this._getFeatures,
  };

  base(this);

  /**
   * Filter to getFeaturerequest
   */
  this._filter = {
    bbox: null
  };

  /**
   * @FIXME add description
   */
  this._allfeatures = false;

  /**
   * Referred layer
   */
  this._layer = options.layer;

  /**
   * Cache stored features requested thorugh a "formatter = 0 | 1" param
   * 
   * @since 3.9.0
   */
  this._formatter = [
    this._createSource(),
    null,
  ];

  /**
   * Store editing features (requested with formatter = 0)
   */
  this._featuresstore = this._formatter[0];

  /**
   * Whether the editor is active or not
   */
  this._started = false;

  /**
   * Array of not editable fields
   */
  this._noteditablefileds = this._layer.getEditingNotEditableFields() || [];

}

inherit(Editor, G3WObject);

const proto = Editor.prototype;

/**
 * Used when vector Layer's bbox is contained into an already requested bbox (so no a new request is done).
 *
 * @param { number[] } options.filter.bbox bounding box Array [xmin, ymin, xmax, ymax]
 *
 * @returns { boolean } whether can perform a server request
 *
 * @private
 */
proto._canDoGetFeaturesRequest = function(options = {}) {
  const { bbox } = options.filter || {};
  const is_vector = bbox && Layer.LayerTypes.VECTOR === this._layer.getType();

  // first request --> need to peform request
  if (is_vector && null === this._filter.bbox) {
    this._filter.bbox = bbox;                                                      // store bbox
    return true;
  }

  // subsequent requests --> check if bbox is contained into an already requested bbox
  if (is_vector) {
    const is_cached = ol.extent.containsExtent(this._filter.bbox, bbox);
    if (!is_cached) this._filter.bbox = ol.extent.extend(this._filter.bbox, bbox); // extend bbox
    return is_cached;
  }

  // default --> perform request
  return true;
};

proto.getEditingSource = function() {
  return this._formatter[0];
};

/**
 * get Source
 */
proto.getSource = function() {
  this._layer.getSource();
};

proto._applyChanges = function(items = [], reverse=true) {
  const changes = ChangesManager.execute(this._formatter[0], items, reverse);
  // apply changes on features of sync feature store
  if (this._formatter[1]) {
    Object
      .entries(changes)
      .forEach(([ action, features = [] ]) => { features.forEach(feature => this.upateSyncEditingSource({ action, feature })) });
  }
};

proto.setChanges = function(items, reverse) {
  this._applyChanges(items, reverse)
};

proto.getLayer = function() {
  return this._layer;
};

proto.setLayer = function(layer) {
  this._layer = layer;
  return this._layer;
};

proto.removeNotEditablePropriertiesFromFeature = function(feature) {
  this._noteditablefileds.forEach(field => feature.unset([field]));
};

/**
 * @param features features to be cloned
 */
proto._cloneFeatures = function(features = []) {
  return features.map(f => f.clone());
};

proto._addFeaturesFromServer = function(features = []) {
  features = this._cloneFeatures(features);
  this._formatter[0].addFeatures(features);
};

proto._doGetFeaturesRequest = function(options={}) {
  if (Applicationstate.online && !this._allfeatures) {
    return this._canDoGetFeaturesRequest(options);
  }
  return false;
};

/**
 * get features from server method
 */
proto._getFeatures = function(options = {}) {
  const d         = $.Deferred();
  const doRequest = this._doGetFeaturesRequest(options);

  // skip when ..
  if (!doRequest) {
    d.resolve();
    return d.promise();
  }

  this._layer
    .getFeatures(options)
    .then(promise => {
      promise
        .then((features = []) => {
          // formatter = 1 --> we need to store sync features
          if (this.getSyncEditingSource()) {
            _getSyncFeaturesFromServer(features, options.filter)
          }
          this._addFeaturesFromServer(features);
          this._allfeatures = !options.filter;
          d.resolve(features);
        })
        .fail(d.reject)
    })
    .fail(d.reject);

    return d.promise();
};

/**
 * revert (cancel) all changes in history and clean session
 */
proto.revert = function() {
  const d = $.Deferred();
  this._formatter[0].setFeatures(this._cloneFeatures(this._layer.readFeatures()));
  d.resolve();
  return d.promise();
};

proto.rollback = function(changes=[]) {
  const d = $.Deferred();
  this._applyChanges(changes, true);
  d.resolve();
  return d.promise();
};

/**
 *
 * @param relations relations response
 */
proto.applyChangesToNewRelationsAfterCommit = function(relations) {
  let layer, source, features;
  for (const id in relations) {
    layer    = this.getLayerById(id);
    source   = this.getEditingLayer(id).getEditingSource();
    features = source.readFeatures();
    features.forEach(f => f.clearState());
    layer.getSource().setFeatures(features);
    layer.applyCommitResponse({
      response: relations[id],
      result: true,
    });
    source.setFeatures(layer.getSource().readFeatures());
  }
};

/**
 * @param opts.relationId
 * @param opts.ids
 * @param opts.field
 * @param opts.values
 */
proto.setFieldValueToRelationField = function({
  relationId,
  ids,
  field,
  values = []
} = {}) {
  const source = SessionsRegistry                     // get source of editing relation layer.
    .getSession(relationId)
    .getEditor()
    .getEditingSource();

  ids.forEach(id => {                                 // get relation feature by id.
    const feature = source.getFeatureById(id);
    if (feature && feature.get(field) == values[0]) { // check field value.
      feature.set(field, values[1]);
    }
  });
};


/**
 * Apply response data from server in case of new inserted feature
 *
 * @param response
 * @param relations
 */
proto.applyCommitResponse = function(response = {}, relations = []) {

  // skip when no response and response.result is false
  if (!(response && response.result)) {
    return;
  }

  const ids     = response.response.new;         // get ids from new attribute of response
  const lockids = response.response.new_lockids; // get new lockId

  ids.forEach(({
    clientid,                                // temporary id created by client __new__
    id,                                      // the new id created and stored on server
    properties                               // properties of the feature saved on server
  } = {}) => {

    const feature = this._formatter[0].getFeatureById(clientid);

    feature.setId(id);                       // set new id
    feature.setProperties(properties);

    relations.forEach(relation => {                                              // handle relations (if provided)
      Object
        .entries(relation)
        .forEach(([ relationId, options = {}]) => {
          const is_pk = options.fatherField.find(d => this._layer.isPkField(d)); // check if parent field is a Primary Key
          if (is_pk) {
            this.setFieldValueToRelationField({                                  // for each field
              relationId,                                                        // relation layer id
              ids: options.ids,                                                  // ids of features of relation layers to check
              field: options.childField[options.fatherField.indexOf(is_pk)],     // relation field to overwrite
              values: [clientid, id]                                             // [<old temporary id value>, <new id value>]
            });
          }
        });
    });

  });

  const features = this.readEditingFeatures();

  features.forEach(f => f.clearState());       // reset state of the editing features (update, new etc..)

  this._layer.setFeatures(features);           // substitute layer features with actual editing features

  this.addLockIds(lockids);                    // add lockIds
};

/**
 * @param lockids locks be added to current layer
 *
 * @since 3.9.0
 */
proto.addLockIds = function(lockids) {
  this._layer.getSource().addLockIds(lockids);
}

/**
 * @returns {*}
 */
proto.getLockIds = function() {
  return this._layer.getSource().getLockIds();
};

/**
 * Run after server has applied changes to origin resource
 *
 * @param commit commit items
 *
 * @returns jQuery promise
 */
proto.commit = function(commit) {

  const d = $.Deferred();

  let relations = [];

  // check if there are commit relations binded to new feature
  if (commit.add.length) {
    relations =
      Object
        .keys(commit.relations)
        .map(relationId => {
          const relation = this._layer.getRelations().getRelationByFatherChildren(this._layer.getId(), relationId);
          return {
            [relationId]: {
              ids: [                                                  // ids of "added" or "updated" relations
                ...commit.relations[relationId].add.map(r => r.id),   // added
                ...commit.relations[relationId].update.map(r => r.id) // updated
              ],
              fatherField: relation.getFatherField(), //father Fields <Array>
              childField: relation.getChildField() //child Fields <Array>
            }
          };
        });
  }

  /** @TODO simplfy nested promises */
  this._layer
    .commit(commit)
    .then(p => {
      p
        .then(r => { this.applyCommitResponse(r, relations); d.resolve(r); })
        .fail(e => d.reject(e))
    })
    .fail(e => d.reject(e));

  return d.promise();
};

/**
 * start editing
 */
proto.start = function(options = {}) {
  const d = $.Deferred();

  /** @TODO simplfy nested promises */
  this
    .getFeatures(options)       // load layer features based on filter type
    .then(p => {
      p
        .then(features => {
          d.resolve(features);  // features are already inside featuresstore
          this._started = true; // if all ok set to started
        })
        .fail(d.reject)

    })
    .fail(d.reject);

  return d.promise()
};

/**
 * Add feature (action to layer)
 */
proto._addFeature = function(feature) {
  this._formatter[0].addFeature(feature);
};

/**
 * Delete feature (action to layer)
 */
proto._deleteFeature = function(feature) {
  this._formatter[0].deleteFeature(feature);
};

/**
 * Update feature (action to layer)
 */
proto._updateFeature = function(feature) {
  this._formatter[0].updateFeature(feature);
};

/**
 * Set features (action to layer)
 */
proto._setFeatures = function(features = []) {
  this._formatter[0].setFeatures(features);
};

/**
 * Read features (action to layer)
 */
proto.readFeatures = function() {
  return this._layer.readFeatures();
};

/**
 * @returns features stored in editor featurestore
 */
proto.readEditingFeatures = function() {
  return this._formatter[0].readFeatures()
};

/**
 * stop editor
 */
proto.stop = function() {
  const d = $.Deferred();
  this._layer
    .unlock()
    .then(response => { this.clear(); d.resolve(response); })
    .fail(d.reject);
  return d.promise();
};

/**
 * run save layer
 */
proto._save = function() {
  this._layer.save();
};

proto.isStarted = function() {
  return this._started;
};

proto.clear = function() {
  this._started     = false;
  this._filter.bbox = null;
  this._allfeatures = false;

  this._clearFeatureStores();

  if (Layer.LayerTypes.VECTOR === this._layer.getType()) {
    this._layer.resetEditingSource(this._formatter[0].getFeaturesCollection());
  }
};

/**
 * @since 3.9.0
 */
proto._clearFeatureStores = function() {
  this._formatter.forEach(f => f.clear())
  this._layer.getFeaturesStore().clear();
};

/**
 * @since 3.9.0
 * 
 * @returns { FeaturesStore | OlFeaturesStore }
 * 
 * @private
 */
proto._createSource = function() {
  return this._layer.getType() === Layer.LayerTypes.TABLE
    ? new FeaturesStore()
    : new OlFeaturesStore();
}

/**
 * @since 3.9.0
 * 
 * @returns {null}
 */
proto.getSyncEditingSource = function() {
  return this._formatter[1];
}

/**
 * @since 3.9.0
 */
proto.createSyncEditingSource = function({ watch } = {}) {
  this.setSyncEditingSource();
  //in case of watch parameter and is a function
  // is called when receive this.upateSyncEditingSource
  if (watch && watch instanceof Function) {
    this._formatter[1]._watch = watch;
  }
};

/**
 * @since 3.9.0
 */
proto.setSyncEditingSource = function(source) {
  this._formatter[1] = source || this._createSource();
}

/**
 * @since 3.9.0
 * 
 * @returns Array of features
 */
proto.readEditingSyncFeatures = function() {
  return this._formatter[1] && this._formatter[1].readFeatures();
};

/**
 * @param { Object } opts 
 * @param opts.action
 * @param opts.feature
 *  
 * @since 3.9.0
 */
proto.upateSyncEditingSource = function({
  action,
  feature,
}={}) {
  if (this._formatter[1]) {
    switch (action) {
      case 'delete':
        this._formatter[1].removeFeature(feature);
        return;
      case 'add':
        // clone it to avoid to change original feature of editing source
        feature = feature.clone();
        this._formatter[1].addFeatures([feature]);
        break;
      case 'update':
        //need to clone it to avoid to change original feature of editing source
        feature = feature.clone();
        this._formatter[1].updateFeature(feature);
        break;
    }
    //check in case of add or update
    // if watch private method is set to sync features store
    if (this._formatter[1]._watch) {
      this._formatter[1]._watch(this._formatter[1].getFeatureById(feature.getId()));
    }
  }
}

/**
 * @since 3.9.0
 */
const _getSyncFeaturesFromServer = async function(editor, features, relation) {
  try {
    const response = (relation && relation.fid)
      ? await RelationsService.getRelations({ ...relation.fid, type: 'data', formatter: 1 })
      : await DataRouterService.getData('search:features', { inputs: { layer: editor._layer, search_endpoint: 'api' }, outputs: false });

    let data;

    if (response.data) {
      data = response.data;
    } else if (response.vector.data) {
      response.vector.data.features = createFeaturesFromVectorDataApi(response.vector.data.features || []);
      data = [response.vector.data]
    }

    // check if the number of features are the same
    if (data && data[0] && data[0].features && features.length === data[0].features.length) {
      /** @TODO need check "id" is equal */
      editor._formatter[1].addFeatures(
        data[0].features.map((f, i) => {
          const feat = new Feature({feature: f})
          feat._setUid(features[i].getUid());
          return feat;
        })
      );
    }

  } catch(err) {
    console.warn(err);
  }
};

module.exports = Editor;