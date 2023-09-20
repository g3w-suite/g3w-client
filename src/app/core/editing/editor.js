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

  this._allfeatures = false;
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

proto.getEditingSource = function() {
  return this._featuresstore;
};

/**
 * get Source
 */
proto.getSource = function() {
  this._layer.getSource();
};

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

proto._addFeaturesFromServer = function(features=[]){
  features = this._cloneFeatures(features);
  this._featuresstore.addFeatures(features);
};

proto._doGetFeaturesRequest = function(options={}) {
  const doRequest = Applicationstate.online &&  !this._allfeatures;
  return doRequest && this._canDoGetFeaturesRequest(options)
};

// get features from server method
proto._getFeatures = function(options={}) {
  const d = $.Deferred();
  const doRequest = this._doGetFeaturesRequest(options);
  if (!doRequest) d.resolve();
  else
    this._layer.getFeatures(options)
      .then(promise => {
        promise.then(features => {
          this._addFeaturesFromServer(features);
          this._allfeatures = !options.filter;
          return d.resolve(features);
        }).fail(err => d.reject(err))
      })
      .fail(err => d.reject(err));
  return d.promise();
};

// method to revert (cancel) all changes in history and clean session
proto.revert = function() {
  const d = $.Deferred();
  const features  = this._cloneFeatures(this._layer.readFeatures());
  this._featuresstore.setFeatures(features);
  d.resolve();
  return d.promise();
};

proto.rollback = function(changes=[]) {
  const d = $.Deferred();
  this._applyChanges(changes, true);
  d.resolve();
  return d.promise()
};

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
 * @param response
 * @param relations
 */
proto.applyCommitResponse = function(response={}, relations=[]) {
  if (response && response.result) {
    const {response:data} = response;
    //get ids from new attribute of response
    const ids = data.new;
    //get new lockId
    const lockids = data.new_lockids;
    /**
     * - clientid is temporary id create by client __new__
     * - id is the new id create by server and store
     * - properties are properties of the feature saved on server
     */
    ids.forEach(({clientid, id, properties}={}) => {
      const feature = this._featuresstore.getFeatureById(clientid);
      feature.setId(id); //set new id
      feature.setProperties(properties);
      //handle relations if provided
      relations.forEach(relation => {
        Object
          .entries(relation)
          .forEach(([relationId, options={}]) => {
            const {
              fatherField,
              childField,
              ids
            } = options;
            //Check if parent layer field is pk
            const fatherPkField = fatherField.find(fField => this._layer.isPkField(fField));
            //if found
            if (fatherPkField) {
              //for each field
              this.setFieldValueToRelationField({
                relationId, //relation layer id
                ids, //ids of features of relation layers to check
                field: childField[fatherField.indexOf(fatherPkField)], //get relation field to overwrite
                values: [clientid, id] //[<old temporary id value>, <new id value>]
              })
            }
          })
      })
    });
    //read feature from editor featurestore
    const features = this.readEditingFeatures();

    //reset state of the features (update, new etc..)
    features.forEach(feature => feature.clearState());

    //set layer features (substitute to actual features)
    this._layer.setFeatures(features);

    //add lockIds
    this.addLockIds(lockids);
  }
};

/**
 * Add lock id to current layer
 * @since v3.7.0
 * @param lockids
 */
proto.addLockIds = function(lockids) {
  this._layer.getSource().addLockIds(lockids);
}

/**
 *
 * @returns {*}
 */
proto.getLockIds = function(){
  return this._layer.getSource().getLockIds();
};

// run after server apply changed to origin resource
proto.commit = function(commitItems) {
  const d = $.Deferred();
  // in case of relations bind to new feature
  const relations = commitItems.add.length ?
    //check if there are commit relations
    Object
      .keys(commitItems.relations)
      .map(relationId => {
        //get Layer relation
        const layerRelation = this._layer.getRelations().getRelationByFatherChildren(this._layer.getId(), relationId);
        //get updates changes
        const updates = commitItems.relations[relationId].update.map(relation => relation.id);
        //get add new relations
        const add = commitItems.relations[relationId].add.map(relation => relation.id);
        return {
          [relationId]: {
            ids: [...add, ...updates], //store id of relation added or changed
            fatherField: layerRelation.getFatherField(), //father Fields <Array>
            childField: layerRelation.getChildField() //child Fields <Array>
          }
        }
      }) :

    []; //empty Array

  this._layer.commit(commitItems)
    .then(promise => {
      promise
        .then(response => {
          this.applyCommitResponse(response, relations);
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

proto._addFeature = function(feature) {
  this._featuresstore.addFeature(feature);
};

proto._deleteFeature = function(feature) {
  this._featuresstore.deleteFeature(feature);
};

proto._updateFeature = function(feature) {
  this._featuresstore.updateFeature(feature);
};

proto._setFeatures = function(features) {
  this._featuresstore.setFeatures(features);
};

proto.readFeatures = function(){
  return this._layer.readFeatures();
};

proto.readEditingFeatures = function(){
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

proto.isStarted = function() {
  return this._started;
};

proto.clear = function() {
  this._started = false;
  this._filter.bbox = null;
  this._allfeatures = false;
  this._featuresstore.clear();
  this._layer.getFeaturesStore().clear();
  this._layer.getType() === Layer.LayerTypes.VECTOR && this._layer.resetEditingSource( this._featuresstore.getFeaturesCollection());
};


module.exports = Editor;
