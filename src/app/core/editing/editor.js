import Applicationstate from 'store/application-state';
import ChangesManager from 'services/editing';
import SessionsRegistry from 'store/sessions';
import DataRouterService from 'services/data';

const { inherit, base } = require('core/utils/utils');
const G3WObject = require('core/g3wobject');
const FeaturesStore = require('core/layers/features/featuresstore');
const OlFeaturesStore = require('core/layers/features/olfeaturesstore');
const Layer = require('core/layers/layer');
const Feature = require('core/layers/features/feature');

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
  this._featuresstore = this._createSource();
  //@since v3.7.0 eventually store the same number of features but with different properties values
  //for example derived from formatted 1 parameter request for Table Layer
  this._syncfeaturesstore = null;
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

proto._addFeaturesFromServer = function(features=[]) {
  features = this._cloneFeatures(features);
  this._featuresstore.addFeatures(features);
};

/**
 * @since v3.7.0
 * @private
 */
proto._addSyncFeaturesFromServer = function(features=[]) {
  this._syncfeaturesstore.addFeatures(features);
};

proto._doGetFeaturesRequest = function(options={}) {
  const doRequest = Applicationstate.online &&  !this._allfeatures;
  return doRequest && this._canDoGetFeaturesRequest(options)
};

// get features from server method
proto._getFeatures = function(options={}) {
  const d = $.Deferred();
  const doRequest = this._doGetFeaturesRequest(options);
  let syncDataPromise;
  if (!doRequest) d.resolve();
  else {
    const returnPromiseFeatures = async (features=[]) => {
      if (syncDataPromise) {
        try {
          const {data} = await syncDataPromise;
          if (data && data[0] && data[0].features) {
            const syncFeatures = [];
            //Check if the number of features are the same
            if (features.length === data[0].features.length) {
              //@TODO need check id is equal
              this._addSyncFeaturesFromServer(features.map((feature, index) => {
                const syncFeature = feature.clone()
                syncFeature.setProperties(data[0].features[index].getProperties());
                return syncFeature;
              }));
            }
          }
        } catch(err) {
          console.log(err)
          //TODO In case of error
        }
      }
      this._addFeaturesFromServer(features);
      this._allfeatures = !options.filter;
      return d.resolve(features);
    }
    //check if we need to store sync features
    if (this.getSyncEditingSource()) {
      syncDataPromise = DataRouterService.getData('search:features', {
        inputs: {
          layer: this._layer,
          search_endpoint: 'api'
        },
        outputs: false
      })
    }

    this._layer.getFeatures(options)
      .then(promise => {
        promise
          .then(returnPromiseFeatures)
          .fail(err => d.reject(err))
      })
      .fail(err => d.reject(err));
  }
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

proto.setFieldValueToRelationField = function({relationId, ids, field, values=[]}={}){
  const editingLayerSource = SessionsRegistry.getSession(relationId).getEditor().getEditingSource();
  ids.forEach(id => {
    const feature = editingLayerSource.getFeatureById(id);
    if (feature) {
      const fieldvalue = feature.get(field);
      fieldvalue == values[0] && feature.set(field, values[1]);
    }
  })
};

// apply response data from server in case of new inserted feature
proto.applyCommitResponse = function(response={}, relations=[]) {
  if (response && response.result) {
    const {response:data} = response;
    const ids = data.new;
    const lockids = data.new_lockids;
    ids.forEach(idobj => {
      const feature = this._featuresstore.getFeatureById(idobj.clientid);
      feature.setId(idobj.id);
      feature.setProperties(idobj.properties);
      relations.forEach(relation =>{
        Object.entries(relation).forEach(([relationId, options]) => {
          const value = feature.get(options.fatherField);
          this.setFieldValueToRelationField({
            relationId,
            ids: options.ids,
            field: options.childField,
            values:[idobj.clientid, value]
          })
        })
      })
    });
    const features = this._featuresstore.readFeatures();
    features.forEach(feature => feature.clearState());
    this._layer.setFeatures(features);
    this._layer.getSource().addLockIds(lockids);
  }
};

proto.getLockIds = function(){
  return this._layer.getSource().getLockIds();
};

// run after server apply changed to origin resource
proto.commit = function(commitItems) {
  const d = $.Deferred();
  // in case of relations bind to new feature
  const relations = commitItems.add.length ? Object.keys(commitItems.relations).map(relationId => {
    const layerRelation = this._layer.getRelations().getRelationByFatherChildren(this._layer.getId(), relationId);
    const updates = commitItems.relations[relationId].update.map(relation => relation.id);
    const add = commitItems.relations[relationId].add.map(relation => relation.id);
    return {
      [relationId]:{
        ids: [...add, ...updates],
        fatherField: layerRelation.getFatherField(),
        childField: layerRelation.getChildField()
      }
    }
  }) : [];
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

proto.readFeatures = function() {
  return this._layer.readFeatures();
};

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

/**
 * @since v3.7.0
 * @returns {FeaturesStore|OlFeaturesStore}
 * @private
 */
proto._createSource = function() {
  return this._layer.getType() === Layer.LayerTypes.TABLE ?
    new FeaturesStore() :
    new OlFeaturesStore();
}

/**
 * @since v3.7.0
 * @returns {null}
 */
proto.getSyncEditingSource = function() {
  return this._syncfeaturesstore;
}

/**
 * @since v3.7.0
 */
proto.setSyncEditingSource = function(source) {
  this._syncfeaturesstore = source || this._createSource();
}

/**
 *
 * @returns Array of features
 */
proto.readEditingSyncFeatures = function() {
  return this._syncfeaturesstore.readFeatures();
};

module.exports = Editor;
