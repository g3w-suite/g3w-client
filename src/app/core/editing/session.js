import MapLayersStoresRegistry from 'store/map-layers';
import SessionsRegistry        from 'store/sessions';

const {
  base,
  inherit
}                      = require('utils');
const G3WObject        = require('core/g3wobject');
const History          = require('core/editing/history');
const Layer            = require('core/layers/layer');
const { is3DGeometry } = require('utils/geo').Geometry;

function Session(options={}) {
  this.setters = {
    /**
     *
     * @param options
     * @returns {*}
     */
    start(options={}) {
      return this._start(options);
    },
    /**
     *
     * @param options
     * @returns {*}
     */
    getFeatures(options={}) {
      return this._getFeatures(options);
    },
    /**
     *
     * @returns {void|*}
     */
    stop() {
      return this._stop();
    },
    /**
     * Hook to get informed that are saved on server
     * @param commitItems
     */
    saveChangesOnServer(commitItems){},
  };
  base(this, options);

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
  //store temporary change not save on history
  this._temporarychanges = [];
  this.register();
}

inherit(Session, G3WObject);

const proto = Session.prototype;

/**
 *
 * @returns {*}
 */
proto.getId = function() {
  return this.state.id;
};

/**
 *
 * @returns {*|null}
 */
proto.getLastHistoryState = function(){
  return this._history.getLastState();
};

/**
 *
 * @returns {*}
 */
proto.getLastStateId = function() {
  return this._history.getLastState().id;
};

/**
 *
 * @param stateId
 */
proto.deleteState = function(stateId) {
  this._history.removeState(stateId);
};

/**
 *
 */
proto.register = function() {
  SessionsRegistry.register(this);
};

/**
 *
 */
proto.unregister = function(){
  SessionsRegistry.unregister(this.getId());
};

/**
 *
 * @param options
 * @returns {*}
 * @private
 */
proto._start = function(options={}) {
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
proto._getFeatures = function(options={}) {
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

/**
 *
 * @returns {boolean}
 */
proto.isStarted = function() {
  return this.state.started;
};

/**
 *
 * @returns {*}
 */
proto.getEditor = function() {
  return this._editor;
};

/**
 *
 * @param editor
 */
proto.setEditor = function(editor) {
  this._editor = editor;
};

// it used to save temporary changes to the layer
// in history instance and feature store
proto.save = function(options={}) {
  //fill history
  const d = $.Deferred();
  // add temporary modify to history
  if (this._temporarychanges.length) {
    const uniqueId = options.id || Date.now();
    this._history.add(uniqueId, this._temporarychanges)
      .then(() => {
        // clear to temporary changes
        this._temporarychanges = [];
        // resolve if unique id
        d.resolve(uniqueId);
      });
  } else {
    d.resolve(null);
  }
  return d.promise();
};

/**
 *
 * @param feature
 */
proto.updateTemporaryChanges = function(feature) {
  this._temporarychanges.forEach((change) => {
    change.feature.setProperties(feature.getProperties());
  })
};

// method to add temporary feature
proto.pushAdd = function(layerId, feature, removeNotEditableProperties=true) {
  /**
   * @TODO check if it need to deprecate it. All properties are need
   * Please take care of this to understand
   * In case of removeNotEditableProperties true, remove not editable field
   * from feature properties
   */
  const editor = layerId === this.getId() ? this._editor : SessionsRegistry.getSession(layerId).getEditor();

  if (removeNotEditableProperties) {
    editor.removeNotEditablePropriertiesFromFeature(feature);
  }
  const newFeature = feature.clone();

  this.push({
    layerId,
    feature: newFeature.add()
  });

  return newFeature;
};

// delete temporary feature
proto.pushDelete = function(layerId, feature) {
  this.push({
    layerId,
    feature: feature.delete()
  });
  return feature;
};

// add temporary feature changes
proto.pushUpdate = function(layerId, newFeature, oldFeature) {
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

/**
 *
 * @param changeIds
 */
proto.removeChangesFromHistory = function(changeIds = []) {
  this._history.removeStates(changeIds);
};

/**
 *
 * @returns {{}}
 */
proto.moveRelationStatesOwnSession = function() {
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
proto.push = function(New, Old) {
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
proto.revert = function() {
  const d = $.Deferred();
  this._editor.revert().then(()=>{
    this._history.clear();
    d.resolve();
  });
  return d.promise();
};

// handle temporary changes of layer
proto._filterChanges = function() {
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

/**
 *
 * @param changes
 * @returns {*}
 */
proto.rollback = function(changes) {
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

/**
 * Rollback child changes of current session
 * @param ids [array of child layer id]
 */
proto.rollbackDependecies = function(ids=[]) {
  ids.forEach(id => {
    const changes = [];
    this._temporarychanges = this._temporarychanges.filter(temporarychange => {
      if (temporarychange.layerId === id) {
        changes.push(temporarychange);
        return false
      }
    });
    changes.length && SessionsRegistry.getSession(id).rollback(changes);
  });
};

// method undo
proto.undo = function(items) {
  items = items || this._history.undo();
  this._editor.setChanges(items.own, true);
  this._history.canCommit();
  return items.dependencies;
};

// method redo
proto.redo = function(items) {
  items = items || this._history.redo();
  this._editor.setChanges(items.own, true);
  this._history.canCommit();
  return items.dependencies;
};

/**
 *
 * @param itemsToCommit
 * @returns {{add: *[], update: *[], relations: {}, delete: *[]}}
 * @private
 */
proto._serializeCommit = function(itemsToCommit) {
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
        delete: [],
        relations: {} //@since v3.7.1
      };
      layer = commitObj.relations[key];
    } else {
      layer = commitObj;
    }

    items
      .forEach((item) => {
        state = item.getState();
        const GeoJSONFormat = new ol.format.GeoJSON();
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
            // in case of add it have to remove not editable properties
            layer[action].push(value);
            break;
        }
      });
    // check in case of no edit remove relation key
    if (isRelation && !layer.add.length && !layer.update.length && !layer.delete.length) {
      delete commitObj.relations[key];
    }
  }

  //get relation key (layerId) values
  let relations = Object.keys(commitObj.relations);
  // if not relations
  if (relations.length > 0) {
    //store relation layer id that belong to deep relations
    const deleteRelationIds = [];
    //Loop through relation layer id to commit
    relations.forEach(rlId => {
      //check if rlId (relation layer id) ia a child of current commit layer
      if (
        undefined === this._editor
          .getLayer()
          .getRelations()
          .getArray()
          .find(r => rlId === r.getChild())
      ) {
        //if not belong as child relation layer, check
        const relationId = SessionsRegistry
          .getSession(rlId)
          .getEditor()
          .getLayer()
          .getRelations()
          .getArray()
          .find(r => relations.indexOf(r.getFather()) !== -1)
          .getFather();

        commitObj.relations[relationId].relations[rlId] = commitObj.relations[rlId];
        //add to deleteRelationIds
        deleteRelationIds.push(rlId);
      }
    })

    //delete deep relations from current layer relation object
    //because are not relative of this layer
    deleteRelationIds.forEach(rId => delete commitObj.relations[rId]);
  }

  return commitObj;

};

/**
 *
 * @returns {{add: *[], update: *[], relations: {}, delete: *[]}}
 */
proto.getCommitItems = function() {
  return this._serializeCommit(this._history.commit());
};

/**
 *
 * Set geometry: {type} of geojson to a 3D type if needed
 * @param layerId
 * @param commitItems
 */
proto.set3DGeometryType = function({layerId=this.getId(), commitItems}={}){
  const {relations} = commitItems;
  const editingLayer = MapLayersStoresRegistry.getLayerById(layerId).getEditingLayer();
  // check id there is editing layer and if is a vector layer
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
  Object
    .keys(relations)
    .forEach(layerId => this.set3DGeometryType({
      layerId,
      commitItems: relations[layerId]
    }));
};

/**
 * Commit changes on server (save)
 * 
 * @param opts.ids
 * @param opts.items
 * @param opts.relations
 * 
 * @returns {*}
 */
proto.commit = function({
  ids = null,
  items,
  relations = true
} = {}) {

  const d = $.Deferred();

  let commit; // committed items

  // skip when ..
  if (ids) {
    commit = this._history.commit(ids);
    this._history.clear(ids);
    return d.promise();
  }

  commit = items || this._serializeCommit(this._history.commit());

  if (!relations) {
    commit.relations = {};
  }

  this._editor
    .commit(commit)
    .then(response => {

      // skip when response is null or undefined and response.result is false
      if (!(response && response.result)) {
        d.reject(response);
        return;
      }
      
      const { new_relations = {} } = response.response; // check if new relations are saved on server

      // sync server data with local data
      for (const id in new_relations) {
        SessionsRegistry
          .getSession(id)               // get session of relation by id
          .getEditor()
          .applyCommitResponse({        // apply commit response to current editing relation layer
            response: new_relations[id],
            result: true
          });
      }

      this._history.clear();            // clear history

      this.saveChangesOnServer(commit); // dispatch setter event.

      d.resolve(commit, response);

    })
    .fail(err => d.reject(err));

  return d.promise();

};

/**
 *
 * @returns {boolean}
 * @private
 */
proto._canStop = function() {
  return this.state.started || this.state.getfeatures;
};

//stop session
proto._stop = function() {
  const d = $.Deferred();
  if (this._canStop()) {
    this._editor.stop()
      .then(() => {
        this.clear();
        d.resolve();
      })
      .fail(err => d.reject(err));
  } else {
    d.resolve();
  }
  return d.promise();
};

// clear all things bind to session
proto.clear = function() {
  this._allfeatures = false;
  this.state.started = false;
  this.state.getfeatures = false;
  this.clearHistory();
};

//return history
proto.getHistory = function() {
  return this._history;
};

// clear history
proto.clearHistory = function() {
  this._history.clear();
};

module.exports = Session;
