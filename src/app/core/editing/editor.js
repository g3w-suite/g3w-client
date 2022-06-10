import Applicationstate from 'core/applicationstate';
import G3WObject from 'core/g3wobject';
import FeaturesStore  from 'core/layers/features/featuresstore';
import OlFeaturesStore  from 'core/layers/features/olfeaturesstore';
import Layer from 'core/layers/layer';
import ChangesManager  from './changesmanager';
import SessionsRegistry from "./sessionsregistry";
import {containsExtent, extend} from "ol/extent";

// class Editor bind editor to layer to do main actions
class Editor extends G3WObject {
  constructor(options={}) {
    super({
      setters: {
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
        setFeatures(features = []) {
          this._setFeatures(features);
        },
        getFeatures(options = {}) {
          return this._getFeatures(options);
        }
      }
    });
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
  };
  _canDoGetFeaturesRequest(options={}) {
    let doRequest = true;
    if (this._layer.getType() === Layer.LayerTypes.VECTOR) {
      const {bbox} = options.filter || {};
      if (bbox) {
        if (!this._filter.bbox) this._filter.bbox = bbox;
        else if (!containsExtent(this._filter.bbox, bbox)) {
          this._filter.bbox = extend(this._filter.bbox, bbox);
        } else doRequest = false;
      }
    }
    return doRequest
  };

  getEditingSource() {
    return this._featuresstore;
  };

  /**
   * get Source
   */
  getSource() {
    this._layer.getSource();
  };

  _applyChanges(items=[], reverse=true) {
    ChangesManager.execute(this._featuresstore, items, reverse);
  };

  setChanges(items, reverse) {
    this._applyChanges(items, reverse)
  };

  getLayer() {
    return this._layer;
  };

  setLayer(layer) {
    this._layer = layer;
    return this._layer;
  };

  removeNotEditablePropriertiesFromFeature(feature) {
    this._noteditablefileds.forEach(field => {
      feature.unset([field]);
    });
  };

 //clone features method
  _cloneFeatures(features=[]) {
    return features.map(feature => feature.clone());
  };

  _addFeaturesFromServer(features=[]) {
    features = this._cloneFeatures(features);
    this._featuresstore.addFeatures(features);
  };

  _doGetFeaturesRequest(options={}) {
    const doRequest = Applicationstate.online &&  !this._allfeatures;
    return doRequest && this._canDoGetFeaturesRequest(options)
  };

// fget features methods
  _getFeatures(options={}) {
    const d = $.Deferred();
    const doRequest = this._doGetFeaturesRequest(options);
    if (!doRequest) d.resolve();
    else
      this._layer.getFeatures(options)
        .then((promise) => {
          promise.then((features) => {
            this._addFeaturesFromServer(features);
            this._allfeatures = !options.filter;
            return d.resolve(features);
          }).fail((err) => {
            return d.reject(err);
          })
        })
        .fail(function (err) {
          d.reject(err);
        });
    return d.promise();
  };

// method to revert (cancel) all changes in history and clean session
  revert() {
    const d = $.Deferred();
    const features  = this._cloneFeatures(this._layer.readFeatures());
    this._featuresstore.setFeatures(features);
    d.resolve();
    return d.promise();
  };

  rollback(changes=[]) {
    const d = $.Deferred();
    this._applyChanges(changes, true);
    d.resolve();
    return d.promise()
  };

  applyChangesToNewRelationsAfterCommit(relationsResponse) {
    for (const relationLayerId in relationsResponse) {
      const response = relationsResponse[relationLayerId];
      const layer = this.getLayerById(relationLayerId);
      const editingLayerSource = this.getEditingLayer(relationLayerId).getEditingSource();
      const features = editingLayerSource.readFeatures();
      features.forEach((feature) => {
        feature.clearState();
      });
      layer.getSource().setFeatures(features);
      layer.applyCommitResponse({
        response,
        result: true
      });
      editingLayerSource.setFeatures(layer.getSource().readFeatures());
    }
  };

  setFieldValueToRelationField({relationId, ids, field, values=[]}={}) {
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
  applyCommitResponse(response={}, relations=[]) {
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

  getLockIds() {
    return this._layer.getSource().getLockIds();
  };

// run after server apply changed to origin resource
  commit(commitItems) {
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
  start(options={}) {
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

  _addFeature(feature) {
    this._featuresstore.addFeature(feature);
  };

  _deleteFeature(feature) {
    this._featuresstore.deleteFeature(feature);
  };

  _updateFeature(feature) {
    this._featuresstore.updateFeature(feature);
  };

  _setFeatures(features) {
    this._featuresstore.setFeatures(features);
  };

  readFeatures() {
    return this._layer.readFeatures();
  };

  readEditingFeatures() {
    return this._featuresstore.readFeatures()
  };

// stop editor
  stop() {
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
  _save() {
    this._layer.save();
  };

  isStarted() {
    return this._started;
  };

  clear() {
    this._started = false;
    this._filter.bbox = null;
    this._allfeatures = false;
    this._featuresstore.clear();
    this._layer.getFeaturesStore().clear();
    this._layer.getType() === Layer.LayerTypes.VECTOR && this._layer.resetEditingSource( this._featuresstore.getFeaturesCollection());
  };

  _canDoGetFeaturesRequest(options={}) {
    let doRequest = true;
    if (this._layer.getType() === Layer.LayerTypes.VECTOR) {
      const {bbox} = options.filter || {};
      if (bbox) {
        if (!this._filter.bbox) this._filter.bbox = bbox;
        else if (!containsExtent(this._filter.bbox, bbox)) {
          this._filter.bbox = extend(this._filter.bbox, bbox);
        } else doRequest = false;
      }
    }
    return doRequest
  };

  getEditingSource() {
    return this._featuresstore;
  };

  /**
   * get Source
   */
  getSource() {
    this._layer.getSource();
  };

  _applyChanges(items=[], reverse=true) {
    ChangesManager.execute(this._featuresstore, items, reverse);
  };

  setChanges(items, reverse) {
    this._applyChanges(items, reverse)
  };

  getLayer() {
    return this._layer;
  };

  setLayer(layer) {
    this._layer = layer;
    return this._layer;
  };

  removeNotEditablePropriertiesFromFeature(feature) {
    this._noteditablefileds.forEach(field => {
      feature.unset([field]);
    });
  };

//clone features method
  _cloneFeatures(features=[]) {
    return features.map(feature => feature.clone());
  };

  _addFeaturesFromServer(features=[]) {
    features = this._cloneFeatures(features);
    this._featuresstore.addFeatures(features);
  };

  _doGetFeaturesRequest(options={}) {
    const doRequest = Applicationstate.online &&  !this._allfeatures;
    return doRequest && this._canDoGetFeaturesRequest(options)
  };

// fget features methods
  _getFeatures(options={}) {
    const d = $.Deferred();
    const doRequest = this._doGetFeaturesRequest(options);
    if (!doRequest) d.resolve();
    else
      this._layer.getFeatures(options)
        .then((promise) => {
          promise.then((features) => {
            this._addFeaturesFromServer(features);
            this._allfeatures = !options.filter;
            return d.resolve(features);
          }).fail((err) => {
            return d.reject(err);
          })
        })
        .fail(function (err) {
          d.reject(err);
        });
    return d.promise();
  };

 // method to revert (cancel) all changes in history and clean session
  revert() {
    const d = $.Deferred();
    const features  = this._cloneFeatures(this._layer.readFeatures());
    this._featuresstore.setFeatures(features);
    d.resolve();
    return d.promise();
  };

  rollback(changes=[]) {
    const d = $.Deferred();
    this._applyChanges(changes, true);
    d.resolve();
    return d.promise()
  };

  applyChangesToNewRelationsAfterCommit(relationsResponse) {
    for (const relationLayerId in relationsResponse) {
      const response = relationsResponse[relationLayerId];
      const layer = this.getLayerById(relationLayerId);
      const editingLayerSource = this.getEditingLayer(relationLayerId).getEditingSource();
      const features = editingLayerSource.readFeatures();
      features.forEach((feature) => {
        feature.clearState();
      });
      layer.getSource().setFeatures(features);
      layer.applyCommitResponse({
        response,
        result: true
      });
      editingLayerSource.setFeatures(layer.getSource().readFeatures());
    }
  };

  setFieldValueToRelationField({relationId, ids, field, values=[]}={}) {
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
  applyCommitResponse(response={}, relations=[]) {
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

  getLockIds() {
    return this._layer.getSource().getLockIds();
  };

// run after server apply changed to origin resource
  commit(commitItems) {
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
  start(options={}) {
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

  _addFeature(feature) {
    this._featuresstore.addFeature(feature);
  };

  _deleteFeature(feature) {
    this._featuresstore.deleteFeature(feature);
  };

  _updateFeature(feature) {
    this._featuresstore.updateFeature(feature);
  };

  _setFeatures(features) {
    this._featuresstore.setFeatures(features);
  };

  readFeatures() {
    return this._layer.readFeatures();
  };

  readEditingFeatures() {
    return this._featuresstore.readFeatures()
  };

// stop editor
  stop() {
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
  _save() {
    this._layer.save();
  };

  isStarted() {
    return this._started;
  };

  clear() {
    this._started = false;
    this._filter.bbox = null;
    this._allfeatures = false;
    this._featuresstore.clear();
    this._layer.getFeaturesStore().clear();
    this._layer.getType() === Layer.LayerTypes.VECTOR && this._layer.resetEditingSource( this._featuresstore.getFeaturesCollection());
  };

}

export default  Editor;
