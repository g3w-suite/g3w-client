import SessionsRegistry        from 'store/sessions';
import MapLayersStoresRegistry from 'store/map-layers';
import G3WObject               from 'core/g3wobject';

const History                  = require('core/editing/history');
const Layer                    = require('core/layers/layer');
const { is3DGeometry }         = require('core/utils/geo').Geometry;

module.exports = class Session extends G3WObject {

  constructor(options = {}) {

    super();

    this.state    = {
      id:          options.id,
      started:     false,
      getfeatures: false
    };

    this._editor  = options.editor;

    this._history = new History({ id: this.state.id });

    this._temporarychanges = [];

    this.register();

    this.setters = {
      start:       this._start.bind(this),
      getFeatures: this._getFeatures.bind(this),
      stop:        this._stop.bind(this),
      /**
       * hook to  get informed that are saved on server
       */
      saveChangesOnServer(commitItems) { } 
    };
  }

  getId() {
    return this.state.id;
  }

  getLastHistoryState() {
    return this._history.getLastState();
  }

  getLastStateId() {
    return this._history.getLastState().id;
  }

  deleteState(id) {
    this._history.removeState(id);
  }

  register() {
    SessionsRegistry.register(this);
  }

  unregister() {
    SessionsRegistry.unregister(this.getId());
  }

  _start(options = {}) {
    const d = $.Deferred();

    this._editor
      .start(options)
      .then(features => { this.state.started = true; d.resolve(features); })
      .fail(err => { d.reject(err); });

    return d.promise();
  }

  /**
   * Get features from server by editor
   */
  _getFeatures(options = {}) {
    const d = $.Deferred();

    if (this._allfeatures) {
      d.resolve([]);
    } else {
      this._allfeatures = !options.filter;
      this._editor
        .getFeatures(options)
        .then(promise => {
          promise
            .then(features => { this.state.getfeatures = true; d.resolve(features); })
            .fail(err => d.reject(err));
        });
    }

    return d.promise();
  }

  isStarted() {
    return this.state.started;
  }

  getEditor() {
    return this._editor;
  }

  setEditor(editor) {
    this._editor = editor;
  }

  /**
   * Save temporary changes to the layer in history and feature stores
   */
  save(options={}) {
    const d = $.Deferred();

    // add temporary changes to history
    if (this._temporarychanges.length) {
      const uniqueId = options.id || Date.now();
      this._history
        .add(uniqueId, this._temporarychanges)
        // clear temporary changes and resolve with unique id
        .then(() => { this._temporarychanges = []; d.resolve(uniqueId); });
    } else {
      d.resolve(null);
    }

    return d.promise();
  }

  updateTemporaryChanges(feature) {
    this._temporarychanges.forEach((change) => { change.feature.setProperties(feature.getProperties()); })
  }

  /**
   * Add temporary feature (ref: `removeNotEditableProperties`)
   */
  pushAdd(layerId, feature, removeNotEditableProperties = true) {
    if (removeNotEditableProperties) {
      this._editor.removeNotEditablePropriertiesFromFeature(feature);
    } 
    const newFeature = feature.clone();
    this.push({ layerId, feature: newFeature.add() });
    return newFeature;
  }

  /**
   * Remove temporary feature
   */
  pushDelete(layerId, feature) {
    this.push({ layerId, feature: feature.delete() });
    return feature;
  }

  /**
   * Add temporary feature changes
   */
  pushUpdate(layerId, newFeat, oldFeat) {
    // in case of change attribute immediately after create feature
    if (newFeat.isNew()) {
      const featIndex = this._temporarychanges.findIndex((change) => change.layerId === layerId && change.feature.getId() === newFeat.getId());
      if (-1 !== featIndex) {
        const feature = newFeat.clone();
        feature.add();
        this._temporarychanges[featIndex].feature = feature;
        return;
      }
    }
    this.push({ layerId, feature: newFeat.update() }, { layerId, feature: oldFeat.update() })
  }

  removeChangesFromHistory(changeIds = []) {
    this._history.removeStates(changeIds);
  }

  moveRelationStatesOwnSession() {
    const ids           = {};
    const { relations } = this.getCommitItems();

    for (let id in relations) {
      const states = this._history.getRelationStates(id);

      SessionsRegistry
        .getSession(id)
        ._history
        .insertStates(states);

      ids[id] = states.map(state => state.id);
    }

    return ids;
  }

  /**
   * Add temporary features that will be added with save method
   * 
   * @param {{id, feature}} newFeat
   * @param {{id, feature}} oldFeat 
   */
  push(newFeat, oldFeat) {
    // check is set old (edit)
    this._temporarychanges.push(oldFeat ? [oldFeat, newFeat] : newFeat);
  }

  /**
   * revert (cancel) all changes in history and clean session
   */
  revert() {
    const d = $.Deferred();

    this._editor
      .revert()
      .then(() => { this._history.clear(); d.resolve(); });

    return d.promise();
  }

  /**
   * handle temporary changes of layer
   */
  _filterChanges() {
    const id      = this.getId();
    const changes = {
      own:          [],
      dependencies: {},
    };

    this._temporarychanges
      .forEach((temp) => {
        const change = Array.isArray(temp) ? temp[0] : temp;
        if (change.layerId === id) {
          changes.own.push(change);
          return;
        }
        changes.dependencies[change.layerId] = changes.dependencies[change.layerId] ? changes.dependencies[change.layerId] : [];
        changes.dependencies[change.layerId].unshift(change); // FILO
      });

    return changes;
  }

  rollback(changes) {
    if (changes) {
      return this._editor.rollback(changes);
    }

    const d = $.Deferred();

    changes = this._filterChanges();

    this.
      _editor
      .rollback(changes.own)
      .then(()=>{
        for (const id in changes.dependencies) {
          SessionsRegistry.getSession(id).rollback(changes.dependencies[id]);
        }
        d.resolve(changes.dependencies);
      });

    this._temporarychanges = [];

    return d.promise();
  }

  /**
   * Rollback child changes of current session
   * 
   * @param ids [array of child layer id]
   */
  rollbackDependecies(ids = []) {
    ids
      .forEach(id => {
        const changes = [];
        this._temporarychanges = this._temporarychanges.filter(temp => { if (temp.layerId === id) { changes.push(temp); return false; } });
        if (changes.length) {
          SessionsRegistry.getSession(id).rollback(changes);
        }
      });
  }

  undo(items) {
    items = items || this._history.undo();
    this._editor.setChanges(items.own, true);
    this._history.canCommit();
    return items.dependencies;
  }

  redo(items) {
    items = items || this._history.redo();
    this._editor.setChanges(items.own, true);
    this._history.canCommit();
    return items.dependencies;
  }

  _serializeCommit(newItems) {
    const id        = this.getId();
    const commit = {
      add:       [],
      update:    [],
      delete:    [],
      relations: {}
    };

    let state, layer;

    for (const key in newItems) {
      let isRelation = false;
      const items    = newItems[key];

      if (key === id) {
        layer = commit;
      } else {
        isRelation            = true;
        const session         = SessionsRegistry.getSession(key);
        commit.relations[key] = {
          lockids: session ? session.getEditor().getLockIds() : [],
          add: [],
          update: [],
          delete: []
        };
        layer = commit.relations[key];
      }

      items
        .forEach((item) => {

          state = item.getState();
          
          if('delete' === state && !item.isNew()) {
            layer.delete.push(item.getId());
            return;
          }

          const value = (new ol.format.GeoJSON()).writeFeatureObject(item);
          const props = item.getProperties();

          for (const key in value.properties) {
            if (value.properties[key] && 'object' === typeof value.properties[key] && Object === value.properties[key].constructor) {
              value.properties[key] = value.properties[key].value;
            }
            
            if (undefined === value.properties[key] && props[key])
              value.properties[key] = props[key]
            }

            // in case of add need remove non editable properties
            layer[item.isNew() ? 'add' : item.getState()].push(value);

        });

      // check in case of no edit remove relation key
      if (isRelation && !layer.add.length && !layer.update.length && !layer.delete.length) {
        delete commit.relations[key];
      }

    }

    return commit;
  }

  getCommitItems() {
    return this._serializeCommit(this._history.commit());
  }

  /**
   * Set geometry: {type} of geojson to a 3D type if needed
   * 
   * @param layerId
   * @param commitItems
   */
  set3DGeometryType({
    layerId = this.getId(),
    commitItems,
  } = {}) {
    const layer = MapLayersStoresRegistry.getLayerById(layerId).getEditingLayer();

    const type = layer && layer.getType() === Layer.LayerTypes.VECTOR && layer.getGeometryType();

    // if is a 3D vector layer i set on geoJON before send it to server
    if (type && is3DGeometry(type)) {
      commitItems['add']   .forEach(feat => feat.geometry.type = type);
      commitItems['update'].forEach(feat => feat.geometry.type = type);
    }

    // same control of relations layers
    Object
      .keys(commitItems.relations)
      .forEach(id => this.set3DGeometryType({ layerId: id, commitItems: commitItems.relations[id] }));
  }

  commit({
    ids = null,
    items,
    relations = true
  } = {}) {

    const d = $.Deferred();

    let commit;

    if (ids) {
      commit = this._history.commit(ids);
      this._history.clear(ids);
      return d.promise();
    }

    commit           = items            || this._serializeCommit(this._history.commit());
    commit.relations = commit.relations || {};
    
    this
      ._editor
      .commit(commit)
      .then(response => {

        if (!response || !response.result) {
          d.reject(response);
          return;
        }

        const { new_relations = {} } = response.response;

        for (const id in new_relations) {
          SessionsRegistry
            .getSession(id)
            .getEditor()
            .applyCommitResponse({ response: new_relations[id], result: true })
        }

        this._history.clear();

        this.saveChangesOnServer(commit);

        d.resolve(commit, response)
      })
      .fail(err => d.reject(err));

    return d.promise();

  }

  _canStop() {
    return this.state.started || this.state.getfeatures;
  }

  /**
   * stop session 
   */

  _stop() {
    const d = $.Deferred();

    if (!this._canStop()) {
      d.resolve();
      return;
    }

      this
        ._editor
        .stop()
        .then(() => { this.clear(); d.resolve(); })
        .fail(err =>  d.reject(err));

    return d.promise();
  }

  /**
   * clear all things bind to session
   */
  clear() {
    this._allfeatures      = false;
    this.state.started     = false;
    this.state.getfeatures = false;
    this.clearHistory();
    this._editor.clear();
  };

  getHistory() {
    return this._history;
  };

  clearHistory() {
    this._history.clear();
  };

}