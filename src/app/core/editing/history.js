const { base, inherit } = require('utils');
const G3WObject = require('core/g3wobject');

function History(options = {}) {
  this.id = options.id;
  base(this);
  // registered all changes
  /*
  *{
  * _states: [
  *     {
  *       id: unique key
  *       state: [state] // example: history contsins features state
  *                      // array because a tool can apply changes to more than one features at time (split di una feature)
  *     },
  *     {
  *       id: unique key
  *       state: [state]
  *     },
  *   ]
  *     ....
  *
  *  _current: unique key // usefult to undo redo
  *
  *
  * */
  // set maximun "buffer history" lenght for  undo redo
  this._maxSteps = 10;
  this._states = [];
  // reactive state of histrory
  this.state = {
    commit: false,
    undo:false,
    redo: false
  };
  this._current = null; // store the current state of history (useful for undo /redo)
}

inherit(History, G3WObject);

const proto = History.prototype;

proto.add = function(uniqueId, items) {
  //state object is an array of feature/features changed in a transaction
  const d = $.Deferred();
  // before insert an item into the history
  // check if are at last state step (no redo was done)
  // in this way avoid starge barch in the history
  //If we are in the middle of undo, delete all changes in the histroy from the current "state"
  // so ii can create a new history

  if (null === this._current) {
    this._states = [{
      id: uniqueId,
      items
    }]
  } else {
    if (this._states.length && this._current < this.getLastState().id)
      this._states = this._states.filter(state => state.id <= this._current);
    this._states.push({
      id: uniqueId,
      items
    });
  }

  this._current = uniqueId;
  this._setState();
  // return unique id key
  // it can be used in save relation
  d.resolve(uniqueId);
  return d.promise();
};

proto.getRelationStates = function(layerId, {clear=false}={}) {
  const relationStates = [];
  for (let i=0; i < this._states.length; i++) {
    const state = this._states[i];
    const relationItems = state.items.filter((item) => {
      const _layerId = Array.isArray(item) ? item[0].layerId: item.layerId;
      return _layerId === layerId
    });
    relationItems.length && relationStates.push({
      id: state.id,
      items:relationItems
    })
  }
  return relationStates;
};

proto.insertState = function(state) {
  const stateId = state.id;
  let index = this._states.length;
  for (let i=0; i < this._states.length; i++) {
    const _state = this._states[i];
    if (_state.id > stateId) {
      index = i;
      break;
    } else if (_state.id === stateId)
      index = -1;
      break;
  }
  if (index > -1) {
    if (this._current < stateId)
      this._current = stateId;
    this._states.splice(index, 0, state)
  }
};

proto.removeState = function(stateId) {
  let index;
  for (i = 0; i < this._states.length; i++) {
    const state = this._states[i];
    if (state.id === stateId) {
      index = i;
      break;
    }
  }
  if (this._current === stateId)
    this._current = this._states.length > 1 ? this._states[index-1].id : null;
  this._states.splice(index,1);
};

proto.removeStates = function(stateIds = []) {
  for (let i = 0; i < stateIds.length; i++) {
    const stateId = stateIds[i];
    this.removeState(stateId)
  }
};

proto.insertStates = function(states=[]) {
  for (let i=0; i< states.length; i++) {
    this.insertState(states[i]);
  }
  this.canCommit();
};

// internal method to change the state of the  history when we check
// a call to a function that modify the hsitory state
proto._setState = function() {
  this.canUndo();
  this.canCommit();
  this.canRedo();
};

//check if was did an update (update are array contains two items , old e new value)
proto._checkItems = function(items, action) {
  /**
   * action: <reffererd to array index>
   *  0: undo;
   *  1: redo;
   **/
  const newItems = {
    own: [], //array of changes of layer of the current session
    dependencies: {} // dependencies
  };
  items.forEach((item) => {
    if (Array.isArray(item))
      item = item[action];
    // check if belong to session
    if (this.id === item.layerId) {
      newItems.own.push(item)
    } else {
      if (!newItems.dependencies[item.layerId])
        newItems.dependencies[item.layerId] = {
          own: [],
          dependencies: {}
        };
      newItems.dependencies[item.layerId].own.push(item);
    }
  });
  return newItems;
};

// method undo
proto.undo = function() {
  let items;
  if (this._current === this.getFirstState().id) {
    this._current = null;
    items = this._states[0].items;
  } else {
    this._states.find((state, idx) => {
      if (state.id === this._current) {
        items = this._states[idx].items;
        this._current = this._states[idx-1].id;
        return true;
      }
    })
  }
  items = this._checkItems(items, 0);
  this._setState();
  return items;
};

//method redo
proto.redo = function() {
  let items;
  // if not set get first state
  if (!this._current) {
    items = this._states[0].items;
    // set current to first
    this._current = this._states[0].id;
  } else {
    this._states.find((state, idx) => {
      if (this._current === state.id) {
        this._current = this._states[idx+1].id;
        items = this._states[idx+1].items;
        return true;
      }
    })
  }
  items = this._checkItems(items, 1);
  this._setState();
  return items;
};

proto.setItemsFeatureIds = function(unsetnewids=[]) {
  unsetnewids.forEach(unsetnewid =>{
    const {id, clientid} = unsetnewid;
    this._states.forEach(state => {
      const {items} = state;
      items.forEach(item => {
        const feature = item.feature.getId() === clientid && item.feature;
        if (feature) {
          feature.setId(id);
        }
      })
    });
  })
};

proto.clear = function(ids) {
  if (ids)
    this._states.forEach((state, idx) => {
      if (ids.indexOf(state.id) !== -1) {
        if (this._current && this._current === state.id())
          this.undo();
        this._states.splice(idx, 1);
      }
    });
  else this._clearAll();
};

proto._clearAll =  function() {
  this._states = [];
  this._current = null;
  this.state.commit = false;
  this.state.redo = false;
  this.state.undo = false;
};

proto.getState = function(id) {
  return this._states.find(state => state.id === id);
};

proto.getFirstState = function() {
  return this._states.length ? this._states[0] : null;
};

proto.getLastState = function() {
  const length = this._states.length;
  return length ? this._states[length -1] : null;
};

proto.getCurrentState = function() {
  let currentState = null;
  if (this._current && this._states.length) {
    currentState = this._states.find((state) => {
     return this._current === state.id;
    });
  }
  return currentState;
};

// funzione che mi permette di ricavarel'indice dello stato corrente
proto.getCurrentStateIndex = function() {
  let currentStateIndex = null;
  if (this._current && this._states.length) {
    this._states.forEach((state, idx) => {
      if (this._current === state.id) {
        currentStateIndex = idx;
        return false
      }
    });
  }
  return currentStateIndex;
};

// method that response true if we can commit
proto.canCommit = function() {
  const checkCommitItems = this.commit();
  let canCommit = false;
  for (let layerId in checkCommitItems) {
    const commitItem = checkCommitItems[layerId];
    canCommit = canCommit || !!commitItem.length
  }
  this.state.commit = canCommit;
  return this.state.commit;
};

//cauUdo method
proto.canUndo = function() {
  const steps = (this._states.length - 1) - this.getCurrentStateIndex();
  this.state.undo = (null !== this._current) && (this._maxSteps > steps);
  return this.state.undo;
};

// Caon Redo function
proto.canRedo = function() {
  this.state.redo = (this.getLastState() && this.getLastState().id != this._current)
    || (null === this._current && this._states.length > 0);
  return this.state.redo;
};

proto._getStatesToCommit = function() {
  return this._states.filter(state => state.id <= this._current);
};

//get all changes to send to server (mandare al server)
proto.commit = function() {
  const commitItems = {};
  const statesToCommit = this._getStatesToCommit();
  statesToCommit.forEach(state => {
    state.items.forEach(item => {
      let add = true;
      if (Array.isArray(item)) item = item[1];
      commitItems[item.layerId] && commitItems[item.layerId].forEach((commitItem, index) => {
        // check if already inserted feature
        if (commitItem.getUid() === item.feature.getUid()) {
          if (item.feature.isNew() && !commitItem.isDeleted() && item.feature.isUpdated() ) {
            const _item = item.feature.clone();
            _item.add();
            commitItems[item.layerId][index] = _item;
          } else if (item.feature.isNew() && item.feature.isDeleted()) {
            commitItems[item.layerId].splice(index, 1);
          } else if (item.feature.isUpdated() || item.feature.isDeleted())
            commitItems[item.layerId][index] = item.feature;
          add = false;
          return false;
        }
      });
      if (add) {
        const feature = item.feature;
        const layerId = item.layerId;
        if (!(!feature.isNew() && feature.isAdded())) {
          if (!commitItems[layerId])
            commitItems[layerId] = [];
          commitItems[layerId].push(feature);
        }
      }
    });
  });
  return commitItems;
};

module.exports = History;
