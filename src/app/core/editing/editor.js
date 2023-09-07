import Applicationstate from 'store/application-state';
import ChangesManager from 'services/editing';
import SessionsRegistry from 'store/sessions';

const { inherit, base } = require('core/utils/utils');
const G3WObject = require('core/g3wobject');
const FeaturesStore = require('core/layers/features/featuresstore');
const OlFeaturesStore = require('core/layers/features/olfeaturesstore');
const Layer = require('core/layers/layer');

// class Editor bind editor to layer to do main actions
function Editor(options={}) {
  this.setters = {
    save() {
      this._save();
    },
    addFeature(feature) {
      this._addFeature(feature);
    },
    updateFeature(feature) {
      this._updateFeature(feature);
    },
    deleteFeature(feature) {
      this._deleteFeature(feature);
    },
    setFeatures(features=[]) {
      this._setFeatures(features);
    },
    getFeatures(options={}) {
      return this._getFeatures(options);
    }
  };
  base(this);
  // filter to getFeaturerequest
  this._filter = {
    bbox: null
  };

  //set true if all feature are already add. Case table layer
  this._allfeatures = false; //apply to all features of source
  // referred layer
  this._layer = options.layer;
  // editing featurestore
  this._featuresstore = this._layer.getType() === Layer.LayerTypes.TABLE ? new FeaturesStore() : new OlFeaturesStore();
  // editor is active or not
  this._started = false;
  // not editable fields
  this._noteditablefileds = this._layer.getEditingNotEditableFields() || [];
}

inherit(Editor, G3WObject);

const proto = Editor.prototype;

/**
 * Method to check if it can get feature request to server
 * Avoid to repeat request checking filter request for example
 * @param options
 * @returns {boolean}
 * @private
 */
proto._canDoGetFeaturesRequest = function(options={}) {
  let doRequest = true;
  if (this._layer.getType() === Layer.LayerTypes.VECTOR) {
    const {bbox} = options.filter || {};
    if (bbox) {
      if (!this._filter.bbox) this._filter.bbox = bbox;
      else if (!ol.extent.containsExtent(this._filter.bbox, bbox)) {
        this._filter.bbox = ol.extent.extend(this._filter.bbox, bbox);
      } else doRequest = false;
    }
  }
  return doRequest
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

proto.removeNotEditablePropriertiesFromFeature = function(feature){
  this._noteditablefileds.forEach(field => feature.unset([field]));
};

//clone features method
proto._cloneFeatures = function(features=[]) {
  return features.map(feature => feature.clone());
};

proto._addFeaturesFromServer = function(features=[]) {
  features = this._cloneFeatures(features);
  this._featuresstore.addFeatures(features);
};

proto._doGetFeaturesRequest = function(options={}) {
  const doRequest = Applicationstate.online && !this._allfeatures;
  return doRequest && this._canDoGetFeaturesRequest(options)
};

// get features from server method
proto._getFeatures = function(options={}) {
  const d = $.Deferred();
  //check if can do a request
  if (!this._doGetFeaturesRequest(options)) d.resolve();
  else {
    //get layer features
    this._layer.getFeatures(options)
      .then(promise => {
        promise
          .then(features => {
            this._addFeaturesFromServer(features);
            this._allfeatures = !options.filter;
            return d.resolve(features);
          })
          .fail(err => d.reject(err))
      })
      .fail(err => d.reject(err));
  }

  return d.promise();
};

/**
 * Method to revert (cancel) all changes in history and clean session
 */
proto.revert = function() {
  const d = $.Deferred();
  const features  = this._cloneFeatures(this._layer.readFeatures());
  this._featuresstore.setFeatures(features);
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
 * @TODO check if used otherwise nee to be deprecate
 * @param relationsResponse
 */
proto.applyChangesToNewRelationsAfterCommit = function(relationsResponse) {
  for (const relationLayerId in relationsResponse) {
    const response = relationsResponse[relationLayerId];
    const layer = this.getLayerById(relationLayerId);
    const editingLayerSource = this.getEditingLayer(relationLayerId).getEditingSource();
    const features = editingLayerSource.readFeatures();
    features.forEach(feature => feature.clearState());
    layer.getSource().setFeatures(features);
    layer.applyCommitResponse({
      response,
      result: true
    });
    editingLayerSource.setFeatures(layer.getSource().readFeatures());
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
    //get features
    const features = this.readEditingFeatures();

    //clear state (new, update etc..)
    features.forEach(feature => feature.clearState());
    //substitute to existing features
    this._layer.setFeatures(features);
    //add eventually new lock ids due to new features
    this._layer.getSource().addLockIds(lockids);
  }
};

/**
 * Get lockids from layer
 * @returns {*}
 */
proto.getLockIds = function(){
  return this._layer.getSource().getLockIds();
};

// run after server apply changed to origin resource
proto.commit = function(commitItems) {
  const d = $.Deferred();
  // in case of relations bind to new feature
  const relations = commitItems.add.length ? //check if new feature will be committed to server ("add" key of commited item)
    //Loop relations attribute (Array)
    Object.keys(commitItems.relations)
      .map(relationLayerId => {//relationLayerId is layer id of relation
        //get relation
        const relation = this._layer.getRelations().getRelationByFatherChildren(this._layer.getId(), relationLayerId);
        //get updates items
        const updates = commitItems.relations[relationLayerId].update.map(relation => relation.id);
        //get add (new) items
        const add = commitItems.relations[relationLayerId].add.map(relation => relation.id);
        //Create an object with key as relationLayerId
        return {
          [relationLayerId]:
            {
              ids: [...add, ...updates], //Array with features ids
              fatherField: relation.getFatherField(), //relation Father layer field
              childField: relation.getChildField() //relation child layer field
            }
        }
      }) : [];
  //Do commit request
  this._layer.commit(commitItems)
    .then(promise => { //return a promise (jquery promise) because is a layer setters function
      promise
        .then(response => {
          //handle server commit response
          this.applyCommitResponse(response, relations);
          //resolve response
          d.resolve(response);
        })
        .fail(err => d.reject(err))
    })
    .fail(err => d.reject(err));

  return d.promise();
};

//start editing function
proto.start = function(options={}) {
  const d = $.Deferred();
  // load features of layer based on filter type
  this.getFeatures(options)
    .then(promise => {
      promise
        .then(features => {
          // the features are already inside featuresstore
          d.resolve(features);
          //if all ok set to started
          this._started = true;
        })
        .fail(err => d.reject(err))
    })
    .fail(err => d.reject(err));
  return d.promise()
};

//action to layer

/**
 * Add Feature to source
 * @param feature
 * @private
 */
proto._addFeature = function(feature) {
  this._featuresstore.addFeature(feature);
};

/**
 * Delete feature from source
 * @param feature
 * @private
 */
proto._deleteFeature = function(feature) {
  this._featuresstore.deleteFeature(feature);
};

/**
 * Update feature
 * @param feature
 * @private
 */
proto._updateFeature = function(feature) {
  this._featuresstore.updateFeature(feature);
};

/**
 * Set features
 * @param features
 * @private
 */
proto._setFeatures = function(features) {
  this._featuresstore.setFeatures(features);
};

/*
Read feature from source
 */
proto.readFeatures = function() {
  return this._layer.readFeatures();
};

/**
 * Read feature from editing layer source
 * @returns {*}
 */
proto.readEditingFeatures = function() {
  return this._featuresstore.readFeatures()
};

// stop editor
proto.stop = function() {
  const d = $.Deferred();
  this._layer.unlock()
    .then(response => {
      this.clear();
      d.resolve(response);
    })
    .fail(err => d.reject(err));
  return d.promise();
};

//run save layer
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
  this._started = false;
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
