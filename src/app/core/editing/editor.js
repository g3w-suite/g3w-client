import Applicationstate from 'store/application-state';
import ChangesManager   from 'services/editing';
import SessionsRegistry from 'store/sessions';

const { inherit, base } = require('utils');
const G3WObject         = require('core/g3wobject');
const FeaturesStore     = require('core/layers/features/featuresstore');
const OlFeaturesStore   = require('core/layers/features/olfeaturesstore');
const Layer             = require('core/layers/layer');

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
   * Store editing features
   * 
   * @type { FeaturesStore | OlFeaturesStore }
   */
  this._featuresstore = Layer.LayerTypes.TABLE === this._layer.getType() ? new FeaturesStore() : new OlFeaturesStore();

  /**
   * Whether editor is active or not
   *
   * @type { boolean }
   */
  this._started = false;

  /**
   * Not editable fields
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

  // first request --> need to perform request
  if (is_vector && null === this._filter.bbox) {
    this._filter.bbox = bbox;                                                      // store bbox
    return true;
  }

  // subsequent requests --> check if bbox is contained into an already requested bbox
  if (is_vector) {
    //check if current bbox is contained on cached bbox extent
    const is_cached = ol.extent.containsExtent(this._filter.bbox, bbox);
    if (!is_cached) {
      // extend bbox
      this._filter.bbox = ol.extent.extend(this._filter.bbox, bbox);
    }
    //need to return true if no cached
    return !is_cached;
  }

  // default --> perform request
  return true;

};

/**
 * Get editing source layer feature
 * 
 * @returns { FeaturesStore | OlFeaturesStore }
 */
proto.getEditingSource = function() {
  return this._featuresstore;
};

/**
 * get Source
 */
proto.getSource = function() {
  this._layer.getSource();
};

/**
 * Apply changes to source features
 * 
 * @param items
 * @param reverse
 * 
 * @private
 */
proto._applyChanges = function(items = [], reverse = true) {
  ChangesManager.execute(this._featuresstore, items, reverse);
};

/**
 * @param items
 * @param reverse
 */
proto.setChanges = function(items, reverse) {
  this._applyChanges(items, reverse)
};

/**
 * @returns {*}
 */
proto.getLayer = function() {
  return this._layer;
};

/**
 * @param layer
 * 
 * @returns {*}
 */
proto.setLayer = function(layer) {
  return this._layer = layer;
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

/**
 * @param features
 * 
 * @private
 */
proto._addFeaturesFromServer = function(features = []) {
  this._featuresstore.addFeatures(this._cloneFeatures(features));
};

/**
 * @param options
 * 
 * @returns { boolean }
 * 
 * @private
 */
proto._doGetFeaturesRequest = function(options={}) {
  if  (Applicationstate.online && !this._allfeatures) {
    return this._canDoGetFeaturesRequest(options);
  }
  return false;
};

/**
 * get features from server method
 */
proto._getFeatures = function(options={}) {
  const d         = $.Deferred();
  const doRequest = this._doGetFeaturesRequest(options);
  if (!doRequest) {
    d.resolve();
  } else {
    /** @TODO simplfy nested promises */
    this._layer
      .getFeatures(options)
      .then(p => {
        p
          .then(features => {
            this._addFeaturesFromServer(features);
            this._allfeatures = !options.filter;
            return d.resolve(features);
          })
          .fail(d.reject)
      })
      .fail(d.reject);
  }
  return d.promise();
};

/**
 * revert (cancel) all changes in history and clean session
 */
proto.revert = function() {
  const d = $.Deferred();
  this.getEditingSource().setFeatures(this._cloneFeatures(this.readFeatures()));
  d.resolve();
  return d.promise();
};

/**
 * Rollback changes
 * 
 * @param changes
 * 
 * @returns {*}
 */
proto.rollback = function(changes = []) {
  const d = $.Deferred();
  this._applyChanges(changes, true);
  d.resolve();
  return d.promise()
};

/**
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
 * Handle relation feature saved on server
 * 
 * @param opts.layerId     - id of relation layer
 * @param opts.ids         - Array of changes (new feature id)
 * @param opts.field.name  - field name
 * @param opts.field.value - field value
 */
proto.setFieldValueToRelationField = function(
  {
    layerId,
    ids=[],
    field,
  } = {}
) {
  const source = SessionsRegistry              // get source of editing layer.
    .getSession(layerId)
    .getEditor()
    .getEditingSource();

  ids.forEach(id => {                          // loop relation ids
    const feature = source.getFeatureById(id);
    if (feature) {
      feature.set(field.name, field.value);    // set father feature `value` and `name`
    }
  })
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

    const feature = this._featuresstore.getFeatureById(clientid);

    feature.setId(id);                       // set new id
    feature.setProperties(properties);

    relations.forEach(relation => {                                              // handle relations (if provided)
      Object
        .entries(relation)
        .forEach(([ relationId, options = {}]) => {
          const is_pk = options.fatherField.find(d => this._layer.isPkField(d)); // check if parent field is a Primary Key
          if (is_pk) {
            this.setFieldValueToRelationField({                                  // for each field
              layerId: relationId,                                                        // relation layer id
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

  //need to pass a "clone" of features otherwise every action on layer features and editor feature are duplicate (example addFeatures)
  this._layer.setFeatures([...features]);     // substitute layer features with actual editing features

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

  // check if there are commit relations bind to new feature
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
              fatherField: relation.getFatherField(), // father Fields <Array>
              childField: relation.getChildField()    // child Fields <Array>
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
    .fail(err => d.reject(err));

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
  this._featuresstore.addFeature(feature);
};

/**
 * Delete feature (action to layer)
 */
proto._deleteFeature = function(feature) {
  this._featuresstore.deleteFeature(feature);
};

/**
 * Update feature (action to layer)
 */
proto._updateFeature = function(feature) {
  this._featuresstore.updateFeature(feature);
};

/**
 * Set features (action to layer)
 */
proto._setFeatures = function(features = []) {
  this._featuresstore.setFeatures(features);
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
  return this._featuresstore.readFeatures();
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

/**
 * @returns { boolean } whether has started editor 
 */
proto.isStarted = function() {
  return this._started;
};

/**
 * Method to clear all filled variable
 */
proto.clear = function() {
  this._started     = false;
  this._filter.bbox = null;
  this._allfeatures = false;

  this._featuresstore.clear();
  this._layer.getFeaturesStore().clear();

  // vector layer
  if (this._layer.getType() === Layer.LayerTypes.VECTOR) {
    this._layer.resetEditingSource(this._featuresstore.getFeaturesCollection());
  }
};


module.exports = Editor;