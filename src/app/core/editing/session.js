import G3WObject from 'core/g3wobject';
import History from './history';
import Layer from 'core/layers/layer';
import MapLayersStoreRegistry  from 'core/map/maplayersstoresregistry';
import {is3DGeometry} from 'core/geometry/geometry';
import SessionsRegistry from './sessionsregistry';
import {GeoJSON} from "ol/format";

class Session extends G3WObject {
  constructor(options={}) {
    super({
      ...options,
      setters:{
        start(options={}) {
          return this._start(options);
        },
        getFeatures(options={}) {
          return this._getFeatures(options);
        },
        stop() {
          this._stop();
        },
        saveChangesOnServer(commitItems){} // hook to get informed that are saved on server
      }
    });

    this.state = {
      id: options.id,
      started: false,
      getfeatures: false
    };
    // editor
    this._editor = options.editor;
    this._history = new History({
      id: this.state.id
    });
    this._temporarychanges = [];
    this.register();
    super();
  }
  getId() {
    return this.state.id;
  };

  getLastStateId() {
    return this._history.getLastState().id;
  };

  deleteState(stateId) {
    this._history.removeState(stateId);
  };

  register() {
    SessionsRegistry.register(this);
  };

  unregister(){
    SessionsRegistry.unregister(this.getId());
  };

  _start(options={}) {
    const d = $.Deferred();
    this._editor.start(options)
      .then(features => {
        this.state.started = true;
        d.resolve(features);
      })
      .fail(err => {
        d.reject(err);
      });
    return d.promise();
  };

//method to getFeature from server by editor
  _getFeatures(options={}) {
    const d = $.Deferred();
    if (!this._allfeatures) {
      this._allfeatures = !options.filter;
      this._editor.getFeatures(options)
        .then(promise => {
          promise.then(features => {
            this.state.getfeatures = true;
            d.resolve(features);
          }).fail(err => d.reject(err));
        });
    } else d.resolve([]);

    return d.promise();
  };

  isStarted() {
    return this.state.started;
  };

  getEditor() {
    return this._editor;
  };

  setEditor(editor) {
    this._editor = editor;
  };

// it used to save temporary changes to the layer
// in history instance and feature store
  save(options={}) {
    //fill history
    const d = $.Deferred();
    // add temporary modify to history
    if (this._temporarychanges.length) {
      const uniqueId = options.id || Date.now();
      this._history.add(uniqueId, this._temporarychanges)
        .then(() => {
          // clear to temporary changes
          this._temporarychanges = [];
          // resolve if uniqeu id
          d.resolve(uniqueId);
        });
    } else {
      d.resolve(null);
    }
    return d.promise();
  };

  updateTemporaryChanges(feature) {
    this._temporarychanges.forEach((change) => {
      change.feature.setProperties(feature.getProperties());
    })
  };

// method to add temporary feature
  pushAdd(layerId, feature, removeNotEditableProperties=true) {
    /**
     * Please take care of this to understand
     */
    removeNotEditableProperties && this._editor.removeNotEditablePropriertiesFromFeature(feature);
    const newFeature = feature.clone();
    this.push({
      layerId,
      feature: newFeature.add()
    });
    return newFeature;
  };

// delete temporary feature
  pushDelete(layerId, feature) {
    this.push({
      layerId,
      feature: feature.delete()
    });
    return feature;
  };

// add temporary feature changes
  pushUpdate(layerId, newFeature, oldFeature) {
    // in case of change attribute immediately after create feature
    if (newFeature.isNew()) {
      const temporarynewfeatureIndex = this._temporarychanges.findIndex((change) => {
        return change.layerId === layerId && change.feature.getId() === newFeature.getId();
      });
      if (temporarynewfeatureIndex !== -1) {
        const feature = newFeature.clone();
        feature.add();
        this._temporarychanges[temporarynewfeatureIndex].feature = feature;
        return;
      }
    }
    this.push({
        layerId,
        feature: newFeature.update()
      },
      {
        layerId,
        feature: oldFeature.update()
      })
  };

  removeChangesFromHistory(changeIds = []) {
    this._history.removeStates(changeIds);
  };

  moveRelationStatesOwnSession() {
    const statesIds = {};
    const {relations:relationItems } = this.getCommitItems();
    for (let relationLayerId in relationItems) {
      const relationStates = this._history.getRelationStates(relationLayerId);
      const relationSession = SessionsRegistry.getSession(relationLayerId);
      relationSession._history.insertStates(relationStates);
      statesIds[relationLayerId] = relationStates.map(state => state.id);
    }
    return statesIds;
  };

// it used to add temporary features
// that will be added with save method
  push(New, Old) {
    /*
    New e Old saranno oggetti contenti {
        layerId: xxxx,
        feature: feature
      }
     */
    // check is set old (edit)
    const feature = Old ? [Old, New] : New;
    this._temporarychanges.push(feature);
  };


// method to revert (cancel) all changes in history and clean session
  revert() {
    const d = $.Deferred();
    this._editor.revert().then(()=>{
      this._history.clear();
      d.resolve();
    });
    return d.promise();
  };

// handle temporary changes of layer
  _filterChanges() {
    const id = this.getId();
    const changes = {
      own:[],
      dependencies: {}
    };
    this._temporarychanges.forEach((temporarychange) => {
      const change = Array.isArray(temporarychange) ? temporarychange[0] : temporarychange;
      if (change.layerId === id) changes.own.push(change);
      else {
        if (!changes.dependencies[change.layerId])
          changes.dependencies[change.layerId] = [];
        // FILO
        changes.dependencies[change.layerId].unshift(change);
      }
    });
    return changes;
  };

  rollback(changes) {
    if (changes) return this._editor.rollback(changes);
    else {
      const d = $.Deferred();
      const changes = this._filterChanges();
      this._editor.rollback(changes.own).then(()=>{
        const {dependencies} = changes;
        for (const id in dependencies) {
          SessionsRegistry.getSession(id).rollback(dependencies[id]);
        }
        d.resolve(dependencies);
      });
      this._temporarychanges = [];
      return d.promise();
    }
  };

  rollbackDependecies(ids=[]) {
    ids.forEach(id => {
      const changes = [];
      this._temporarychanges = this._temporarychanges.filter(temporarychange => {
        if (temporarychange.layerId !== id) {
          changes.push(temporarychange);
          return true
        }
        changes.length && SessionsRegistry.getSession(id).rollback(changes);
      });
    })
  };

// method undo
  undo(items) {
    items = items || this._history.undo();
    this._editor.setChanges(items.own, true);
    this._history.canCommit();
    return items.dependencies;
  };

  // method redo
  redo(items) {
    items = items || this._history.redo();
    this._editor.setChanges(items.own, true);
    this._history.canCommit();
    return items.dependencies;
  };

  _serializeCommit(itemsToCommit) {
    const id = this.getId();
    let state;
    let layer;
    const commitObj = {
      add: [],
      update: [],
      delete: [],
      relations: {}
    };
    for (const key in itemsToCommit) {
      let isRelation = false;
      const items = itemsToCommit[key];
      if (key !== id) {
        isRelation = true;
        const sessionRelation = SessionsRegistry.getSession(key);
        const lockids =  sessionRelation ? sessionRelation.getEditor().getLockIds(): [];
        commitObj.relations[key] = {
          lockids,
          add: [],
          update: [],
          delete: []
        };
        layer = commitObj.relations[key];
      } else layer = commitObj;
      items.forEach((item) => {
        state = item.getState();
        const GeoJSONFormat = new GeoJSON();
        switch (state) {
          case 'delete':
            if (!item.isNew())
              layer.delete.push(item.getId());
            break;
          default:
            const value = GeoJSONFormat.writeFeatureObject(item);
            const childs_properties = item.getProperties();
            for (const key in value.properties) {
              if (value.properties[key] && typeof value.properties[key] === 'object' && value.properties[key].constructor === Object)
                value.properties[key] = value.properties[key].value;
              if (value.properties[key] === undefined && childs_properties[key])
                value.properties[key] = childs_properties[key]
            }
            const action = item.isNew() ? 'add' : item.getState();
            // in case of add i have to remove non editable properties
            layer[action].push(value);
            break;
        }
      });
      // check in case of no edit remove relation key
      if (isRelation && !layer.add.length && !layer.update.length && !layer.delete.length) {
        delete commitObj.relations[key];
      }
    }
    return commitObj;
  };

  getCommitItems() {
    const commitItems = this._history.commit();
    return this._serializeCommit(commitItems);
  };

  /**
   *
   * Set geometry: {type} of geojson to a 3D type if needed
   * @param layerId
   * @param commitItems
   */
  set3DGeometryType({layerId=this.getId(), commitItems}={}){
    const {relations} = commitItems;
    const editingLayer = MapLayersStoreRegistry.getLayerById(layerId).getEditingLayer();
    // check id there is a editing layer and if is a vector layer
    if (editingLayer && editingLayer.getType() === Layer.LayerTypes.VECTOR){
      // get Geometry type layer
      const geometryType = editingLayer.getGeometryType();
      // if is a 3D layer i set on geoJON before send it to server
      if (is3DGeometry(geometryType)){
        ['add', 'update'].forEach(action =>{
          commitItems[action].forEach(feature => feature.geometry.type = geometryType)
        })
      }
    }
    // the same control of relations layers
    Object.keys(relations).forEach(layerId => this.set3DGeometryType({
      layerId,
      commitItems: relations[layerId]
    }));
  };

  commit({ids=null, items, relations=true}={}) {
    const d = $.Deferred();
    let commitItems;
    if (ids) {
      commitItems = this._history.commit(ids);
      this._history.clear(ids);
    } else {
      if (items) commitItems = items;
      else {
        commitItems = this._history.commit();
        commitItems = this._serializeCommit(commitItems);
      }
      if (!relations) commitItems.relations = {};
      this._editor.commit(commitItems)
        .then(response => {
          if (response && response.result) {
            const {response:data} = response;
            const {new_relations={}} = data;
            for (const id in new_relations) {
              const session = SessionsRegistry.getSession(id);
              session.getEditor().applyCommitResponse({
                response: new_relations[id],
                result: true
              })
            }
            this._history.clear();
            this.saveChangesOnServer(commitItems);
            d.resolve(commitItems, response)
          } else d.reject(response);
        })
        .fail(err => d.reject(err));
    }
    return d.promise();

  };

  _canStop() {
    return this.state.started || this.state.getfeatures;
  };

  //stop session
  _stop() {
    const d = $.Deferred();
    if (this._canStop())
      this._editor.stop()
        .then(() => {
          this.clear();
          d.resolve();
        })
        .fail(err =>  d.reject(err));
    else d.resolve();
    return d.promise();
  };

  // clear all things bind to session
  clear() {
    this._allfeatures = false;
    this.state.started = false;
    this.state.getfeatures = false;
    this.clearHistory();
    this._editor.clear();
  };

//return l'history
  getHistory() {
    return this._history;
  };

// clear history
  clearHistory() {
    this._history.clear();
  };

}




export default  Session;
