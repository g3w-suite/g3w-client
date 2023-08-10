import Applicationstate from 'store/application-state';
import ChangesManager   from 'services/editing';
import SessionsRegistry from 'store/sessions';
import G3WObject        from 'core/g3wobject';

const FeaturesStore     = require('core/layers/features/featuresstore');
const OlFeaturesStore   = require('core/layers/features/olfeaturesstore');
const Layer             = require('core/layers/layer');

/**
 * Bind editor to layer to do main actions
 */
module.exports = class Editor extends G3WObject {

  constructor(options = {}) {

    super();

    /**
     * Filter for getFeaturerequest
     */
    this._filter = { bbox: null };

    this._allfeatures = false;

    /**
     * Referred layer
     */
    this._layer = options.layer;

    /**
     * Editing featurestore
     */
    this._featuresstore = this._layer.getType() === Layer.LayerTypes.TABLE
      ? new FeaturesStore()
      : new OlFeaturesStore();
    
    /**
     * Editor is active or not
     */
    this._started = false;

    /**
     * Not editable fields
     */
    this._noteditablefileds = this._layer.getEditingNotEditableFields() || [];

    this.setters = {
      save:          this._save.bind(this),
      addFeature:    this._addFeature.bind(this),
      updateFeature: this._updateFeature.bind(this),
      deleteFeature: this._deleteFeature.bind(this),
      setFeatures:   this._setFeatures.bind(this),
      getFeatures:   this._getFeatures.bind(this),
    };

  }

  _canDoGetFeaturesRequest(options = {}) {
    const { bbox } = options.filter || {};
    
    if (this._layer.getType() !== Layer.LayerTypes.VECTOR) {
      return true;
    }

    if (bbox && !this._filter.bbox) {
      this._filter.bbox = bbox;
      return true;
    }
    
    if (bbox && !ol.extent.containsExtent(this._filter.bbox, bbox)) {
      this._filter.bbox = ol.extent.extend(this._filter.bbox, bbox);
      return true;
    }
    
    if (bbox) {
      return false;
    }

    return true;
  }

  getEditingSource() {
    return this._featuresstore;
  }

  /**
   * get Source
   */
  getSource() {
    this._layer.getSource();
  }

  _applyChanges(items = [], reverse = true) {
    ChangesManager.execute(this._featuresstore, items, reverse);
  }

  setChanges(items, reverse) {
    this._applyChanges(items, reverse)
  }

  getLayer() {
    return this._layer;
  }

  setLayer(layer) {
    this._layer = layer;
    return this._layer;
  }

  removeNotEditablePropriertiesFromFeature(feature) {
    this._noteditablefileds.forEach(field => feature.unset([field]));
  };

  //clone features method
  _cloneFeatures(features = []) {
    return features.map(feature => feature.clone());
  }

  _addFeaturesFromServer(features = []) {
    features = this._cloneFeatures(features);
    this._featuresstore.addFeatures(features);
  }

  _doGetFeaturesRequest(options = {}) {
    return Applicationstate.online &&  !this._allfeatures && this._canDoGetFeaturesRequest(options)
  };

  /**
   * Get features from server
   */
  _getFeatures(options = {}) {
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
  }

  /**
   * Revert (cancel) all changes in history and clean session
   */
  revert() {
    const d = $.Deferred();
    const features  = this._cloneFeatures(this._layer.readFeatures());
    this._featuresstore.setFeatures(features);
    d.resolve();
    return d.promise();
  }

  rollback(changes = []) {
    const d = $.Deferred();
    this._applyChanges(changes, true);
    d.resolve();
    return d.promise()
  }

  applyChangesToNewRelationsAfterCommit(relationsResponse) {
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
  }

  setFieldValueToRelationField({
    relationId,
    ids,
    field,
    values = []
  } = {}) {
    const editingLayerSource = SessionsRegistry.getSession(relationId).getEditor().getEditingSource();
    ids.forEach(id => {
      const feature = editingLayerSource.getFeatureById(id);
      if (feature) {
        const fieldvalue = feature.get(field);
        fieldvalue == values[0] && feature.set(field, values[1]);
      }
    })
  }

  /**
   * Apply response data from server in case of new inserted feature
   */
  applyCommitResponse(response = {}, relations = []) {
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
  }

  getLockIds() {
    return this._layer.getSource().getLockIds();
  }

  /**
   * Run after server apply changed to origin resource
   */
  commit(items) {
    const d = $.Deferred();
    this._layer
      .commit(items)
      .then(
        promise => {
          promise
            .then(response => {
              this.applyCommitResponse(
                response,
                // relations bind to new feature
                items.add.length
                  ? Object
                      .keys(items.relations)
                      .map(id => {
                        const relation = this._layer
                          .getRelations()
                          .getRelationByFatherChildren(this._layer.getId(), id);
                        return {
                          [id]: {
                            ids: [
                              ...items.relations[id].add.map(rel => rel.id),   // adds
                              ...items.relations[id].update.map(rel => rel.id) // updates
                            ],
                            fatherField: relation.getFatherField(),
                            childField:  relation.getChildField()
                          }
                        }
                      })
                  : []
                );
              d.resolve(response);
            })
            .fail(err => d.reject(err))
        })
      .fail(err => d.reject(err));
    return d.promise();
  }

  /**
   * Start editing 
   */
  start(options = {}) {
    const d = $.Deferred();
    // load features of layer based on filter type
    this
      .getFeatures(options)
      .then(
        promise => {
          promise
            .then(features => { d.resolve(features); this._started = true; }) // features are already inside featuresstore
            .fail(err => d.reject(err))
        })
      .fail(err => d.reject(err));
    return d.promise()
  }

  //action to layer

  _addFeature(feature) {
    this._featuresstore.addFeature(feature);
  }

  _deleteFeature(feature) {
    this._featuresstore.deleteFeature(feature);
  }

  _updateFeature(feature) {
    this._featuresstore.updateFeature(feature);
  }

  _setFeatures(features = []) {
    this._featuresstore.setFeatures(features);
  }

  readFeatures() {
    return this._layer.readFeatures();
  }

  readEditingFeatures() {
    return this._featuresstore.readFeatures()
  }

  /**
   * Stop editor
   */
  stop() {
    const d = $.Deferred();
    this._layer
      .unlock()
      .then(response => { this.clear(); d.resolve(response); })
      .fail(err => d.reject(err));
    return d.promise();
  }

  /**
   * Save layer
   */ 
  _save() {
    this._layer.save();
  }

  isStarted() {
    return this._started;
  }

  clear() {
    this._started     = false;
    this._filter.bbox = null;
    this._allfeatures = false;
    this._featuresstore.clear();
    this._layer.getFeaturesStore().clear();
    if (this._layer.getType() === Layer.LayerTypes.VECTOR) {
      this._layer.resetEditingSource(this._featuresstore.getFeaturesCollection());
    }
  }

}