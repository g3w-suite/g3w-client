import Applicationstate from 'store/application-state';
import ChangesManager   from 'services/editing';
import SessionsRegistry from 'store/sessions';

const { inherit, base } = require('core/utils/utils');
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
   */
  this._featuresstore = this._layer.getType() === Layer.LayerTypes.TABLE ? new FeaturesStore() : new OlFeaturesStore();

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

/**
 * Get editing source layer feature
 * @returns {*}
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
 * @param items
 * @param reverse
 * @private
 */
proto._applyChanges = function(items=[], reverse=true) {
  ChangesManager.execute(this._featuresstore, items, reverse);
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
  this._featuresstore.addFeatures(features);
};

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
  } else{
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
  this._featuresstore.setFeatures(this._cloneFeatures(this._layer.readFeatures()));
  d.resolve();
  return d.promise();
};

/**
 * Rollback changes
 * @param changes
 * @returns {*}
 */
proto.rollback = function(changes=[]) {
  const d = $.Deferred();
  this._applyChanges(changes, true);
  d.resolve();
  return d.promise()
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
 * Method to handle relation feature saved on server
 * @param layerId id of relation layer
 * @param ids Array of changes/new feature id
 * @param field field object. {name: field name, value }
 */
proto.setFieldValueToRelationField = function(
  {
    layerId,
    ids=[],
    field,
  } = {}
) {
  //Loop of relation ids and set father feature field value field.name
  ids.forEach(id => {
    const feature = SessionsRegistry
      .getSession(layerId) //get session by layerId
      .getEditor() //get editor of session
      .getEditingSource() //get source
      .getFeatureById(id); //get feature by id
    //Check if feature is found and feature has field value
    if (feature) {
      feature.set(field.name, field.value);
    }
  })
};

/**
 * Apply response data from server in case of new inserted feature
 * @param response Object return from server
 * @param relations Array of relations objects related to commit request/response
 */
proto.applyCommitResponse = function(response={}, relations=[]) {
  if (response && response.result) {
    const {response:data} = response;
    // ids Array of object of new features
    // {
    //  clientid: cointain temporary __new id of feature created
    //  id: new id set by server to substitute to temporary
    // }
    const ids = data.new;
    //Array of new lock ids
    const lockids = data.new_lockids;

    //Loop on Array new ids layer features
    ids.forEach(idobj => {

      //get current feature from source based on temporary __new id
      const feature = this._featuresstore.getFeatureById(idobj.clientid);

      //set new id returned by server
      feature.setId(idobj.id);

      //set properties of feature returned by server
      feature.setProperties(idobj.properties);

      //Loop relations array items
      relations.forEach(r => {
        Object.entries(r)
          .forEach(([layerId, options]) => {
            //get father feature property value
            //to set to child relation value field
            const value = feature.get(options.fatherField);
            this.setFieldValueToRelationField({
              layerId, //child layerId
              ids: options.ids, // ids of features belong to relation that need to update
              field: {
                name: options.childField,
                value,
              }
            })

          })

      })

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
 * Get lockids from layer
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
  return this._featuresstore.readFeatures()
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
 * Chef if editor is start
 * @returns {boolean|*}
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
  //in case of vector layer
  if (this._layer.getType() === Layer.LayerTypes.VECTOR) {
    this._layer.resetEditingSource(this._featuresstore.getFeaturesCollection());
  }
};


module.exports = Editor;