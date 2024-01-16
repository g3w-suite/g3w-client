import MapLayersStoresRegistry from 'store/map-layers';
import SessionsRegistry        from 'store/sessions';
import { is3DGeometry }        from 'utils/is3DGeometry';

const {
  base,
  inherit
}                              = require('utils');
const G3WObject                = require('core/g3wobject');
const History                  = require('core/editing/history');
const Layer                    = require('core/layers/layer');

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
  //register this session on session registry
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
proto.unregister = function() {
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
        promise
          .then(features => {
            this.state.getfeatures = true;
            d.resolve(features);
          })
          .fail(err => d.reject(err));
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
  this._temporarychanges
    .forEach((change) => change.feature.setProperties(feature.getProperties()));
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
  // in case of new feature
  if (newFeature.isNew()) {
    //get index of temporary changes
    const tcIndex = this._temporarychanges
      .findIndex((c) => layerId === c.layerId && c.feature.getId() === newFeature.getId());

    if (tcIndex !== -1) {
      const feature = newFeature.clone();
      feature.add();
      this._temporarychanges[tcIndex].feature = feature;
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
  New e Old are objects {
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
  this._editor
    .revert()
    .then(() => {
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
  this._temporarychanges
    .forEach((temporarychange) => {
      const change = Array.isArray(temporarychange) ? temporarychange[0] : temporarychange;
      if (change.layerId === id) {
        changes.own.push(change);
      } else {
        if (!changes.dependencies[change.layerId]) {
          changes.dependencies[change.layerId] = [];
        }
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
  if (changes) {
    return this._editor.rollback(changes);
  } else {
    const d = $.Deferred();
    const changes = this._filterChanges();
    this._editor
      .rollback(changes.own)
      .then(() => {
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
 * Create Json Object for a commit body send to server
 * @param itemsToCommit
 * @returns {{add: *[], update: *[], relations: {}, delete: *[]}}
 * @private
 */
proto._serializeCommit = function(itemsToCommit) {
  const id = this.getId();
  let state;
  let layer;
  const commitObj = {
    add: [], //features to add
    update: [], //features to update
    delete: [], //features to delete
    relations: {} // relation features
  };
  //jey is a layer id that has changes to apply
  for (const key in itemsToCommit) {
    let isRelation = false; //set relation to false
    const items = itemsToCommit[key];
    // case key (layer id) is not equal to id (current layer id on editing)
    if (key !== id) {
      isRelation = true; //set true because these changes belong to features relation items
      const sessionRelation = SessionsRegistry.getSession(key);
      //check lock ids of relation layer
      const lockids =  sessionRelation ? sessionRelation.getEditor().getLockIds(): [];
      //create a relations object
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
        //check state of feature item
        state = item.getState();
        const GeoJSONFormat = new ol.format.GeoJSON();
        switch (state) {
          //item needs to be deleted
          case 'delete':
            //check if is new. If is new mean is not present on server
            //so no need to say to server to delete it
            if (!item.isNew()) {
              layer.delete.push(item.getId());
            }
            break;
          default:
            //convert feature to json ex. {geometry:{tye: 'Point'}, properties:{}.....}
            const itemObj = GeoJSONFormat.writeFeatureObject(item);
            //get properties
            const childs_properties = item.getProperties();
            for (const p in itemObj.properties) {
             // in case the value of property is an object
             if (itemObj.properties[p] && typeof itemObj.properties[p] === 'object' && itemObj.properties[p].constructor === Object) {
               //need to get value from value attribute object
               itemObj.properties[p] = itemObj.properties[p].value;
             }
             // @TODO explain when this condition happen
             if (undefined === itemObj.properties[p] && childs_properties[p]) {
               itemObj.properties[p] = childs_properties[p]
             }
            }
            // in case of add it have to remove not editable properties
            layer[item.isNew() ? 'add' : item.getState()].push(itemObj);
            break;
        }
      });
    // check in case of no edit remove relation key
    if (
      isRelation
      && layer.add.length    === 0 //no relation features to add
      && layer.update.length === 0 //no relation features to update
      && layer.delete.length === 0 //no relation features to delete
    ) {
      delete commitObj.relations[key];
    }
  }

  // Remove deep relations from current layer (commitObj) that are not relative to that layer
  const relations = Object.keys(commitObj.relations || {});
  relations
    .filter(id => undefined === this._editor.getLayer().getRelations().getArray().find(r => id === r.getChild())) // child relations
    .map(id => {
      commitObj.relations[
        SessionsRegistry
          .getSession(id)
          .getEditor()
          .getLayer()
          .getRelations()
          .getArray()
          .find(r => -1 !== relations.indexOf(r.getFather())) // parent relation layer
          .getFather()
        ].relations[id] = commitObj.relations[id];
      return id;
    })
    .forEach(id => delete commitObj.relations[id]);

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
proto.set3DGeometryType = function({
  layerId=this.getId(),
  commitItems}={}
) {
  const { relations } = commitItems;
  const editingLayer = MapLayersStoresRegistry.getLayerById(layerId).getEditingLayer();
  // check id there is editing layer and if is a vector layer
  if (editingLayer && Layer.LayerTypes.VECTOR === editingLayer.getType()) {
    // get Geometry type layer
    const geometryType = editingLayer.getGeometryType();
    // if is a 3D layer i set on geoJON before send it to server
    if (is3DGeometry(geometryType)){
      ['add', 'update']
        .forEach((action) => commitItems[action].forEach(feature => feature.geometry.type = geometryType))
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
