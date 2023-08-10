import G3WObject from 'core/g3wobject';

module.exports = class History extends G3WObject {

  constructor(options = {}) {

    super();

    this.id = options.id;

    /**
     * Maximun "buffer history" lenght (undo/redo)
     */
    this._maxSteps = 10;

    /**
     * Store all changes
     * 
     * @type { Array<id: string, state: []> } id = unique key, state = features state 
     */
    this._states = [];

    /**
     * Pointer to current history state (states's id unique key)
     * 
     * @type {string | null} 
     */
    this._current = null;

    /**
     * Reactive history state 
     */
    this.state = {
      commit: false,
      undo:   false,
      redo:   false,
    };

  }

  add(uniqueId, items) {

    // state object is an array of feature/features changed in a transaction
    const d = $.Deferred();

    // before insert an item into the history
    // check if are at last state step (no redo was done)
    // in this way avoid starge barch in the history
    //If we are in the middle of undo, delete all changes in the histroy from the current "state"
    // so i can create a new history

    if (null === this._current) {
      this._states = [];
    }
    
    if (null !== this._current && this._states.length && this._current < this.getLastState().id) {
        this._states = this._states.filter(state => state.id <= this._current);
    }

    this._states.push({ id: uniqueId, items });

    this._current = uniqueId;

    this._setState();

    // return unique id key
    // it can be used in save relation
    d.resolve(uniqueId);

    return d.promise();
  }

  getRelationStates(layerId, { clear = false } = {}) {
    const states = [];
    for (let i = 0; i < this._states.length; i++) {
      const items = this._states[i].items.filter((item) => (Array.isArray(item) ? item[0].layerId : item.layerId) === layerId);
      if (items.length) {
        states.push({ id: this._states[i].id, items });
      }
    }
    return states;
  }

  insertState(state) {
    let idx = this._states.length;

    for (let i = 0; i < this._states.length; i++) {

      if (this._states[i].id > state.id) {
        idx = i;
        break;
      }
      
      if (this._states[i].id === state.id) {
        idx = -1;
        break;
      }

    }

    if (idx > -1 && this._current < stateId) {
      this._current = state.id;
    }

    if (idx > -1) {
      this._states.splice(idx, 0, state)
    }

  }

  removeState(id) {
    let index;

    for (i = 0; i < this._states.length; i++) {
      if (this._states[i].id === id) {
        index = i;
        break;
      }
    }

    if (this._current === id) {
      this._current = this._states.length > 1 ? this._states[index-1].id : null;
    }

    this._states.splice(index,1);
  }

  removeStates(ids = []) {
    for (let i = 0; i < ids.length; i++) {
      this.removeState(ids[i])
    }
  }

  insertStates(states = []) {
    for (let i = 0; i < states.length; i++) {
      this.insertState(states[i]);
    }
    this.canCommit();
  }

  /**
   * Change history state when an internal function modify the state
   */
  _setState() {
    this.canUndo();
    this.canCommit();
    this.canRedo();
  };

  /**
   * Check if it was an update (update = Array<oldVal, newVal>)
   * 
   * @param {0 | 1} action <reffererd to array index> [0 = undo; 1 = redo;]
   */
  _checkItems(items, action) {
    const newItems = {
      own:          [], // array of changes of layer of the current session
      dependencies: {},
    };

    items.forEach((item) => {

      if (Array.isArray(item)) {
        item = item[action];
      }

      // check if belong to session
      if (this.id === item.layerId) {
        newItems.own.push(item);
        return;
      }

      if (!newItems.dependencies[item.layerId]) {
        newItems.dependencies[item.layerId] = { own: [], dependencies: {} };
      }

      newItems.dependencies[item.layerId].own.push(item);

    });

    return newItems;
  }

  undo() {
    let items;

    if (this._current === this.getFirstState().id) {
      this._current = null;
      items = this._states[0].items;
    } else {
      this._states
        .find((state, idx) => {
          if (state.id === this._current) {
            items = this._states[idx].items;
            this._current = this._states[idx - 1].id;
            return true;
          }
        });
    }

    items = this._checkItems(items, 0);

    this._setState();

    return items;
  }

  redo() {
    let items;

    if (this._current) {
      this._states
        .find((state, idx) => {
          if (this._current === state.id) {
            this._current = this._states[idx+1].id;
            items = this._states[idx+1].items;
            return true;
          }
        });
    } else {
      items = this._states[0].items;
      this._current = this._states[0].id; // set current to first
    }

    items = this._checkItems(items, 1);

    this._setState();

    return items;
  }

  setItemsFeatureIds(ids = []) {
    ids
      .forEach(id => {
        this._states
          .forEach(state => {
            state.items
              .forEach(item => {
                const feature = item.feature.getId() === id.clientid && item.feature;
                if (feature) {
                  feature.setId(id.id);
                }
              });
        });
      });
  }

  clear(ids) {

    if (!ids) {
      this._clearAll();
      return;
    }

    this._states
      .forEach((state, idx) => {
        if (-1 !== ids.indexOf(state.id)) {
          if (this._current && this._current === state.id()) {
            this.undo();
          }
          this._states.splice(idx, 1);
        }
      });

  }

  _clearAll() {
    this._states      = [];
    this._current     = null;
    this.state.commit = false;
    this.state.redo   = false;
    this.state.undo   = false;
  };

  getState(id) {
    return this._states.find(state => state.id === id);
  }

  getFirstState() {
    return this._states.length ? this._states[0] : null;
  }

  getLastState() {
    return this._states.length ? this._states[length -1] : null;
  }

  getCurrentState() {
    if (this._current && this._states.length) {
      return this._states.find((state) => this._current === state.id);
    }
    return null;
  };

  /**
   * Obtain the index of the current state
   */
  getCurrentStateIndex() {
    let currentStateIndex = null;
    if (this._current && this._states.length) {
      this._states.forEach((state, idx) => { if (this._current === state.id) { currentStateIndex = idx; return false; } });
    }
    return currentStateIndex;
  }

  /**
   * @returns true if we can commit
   */
  canCommit() {
    const checkCommitItems = this.commit();
    let canCommit = false;
    for (let layerId in checkCommitItems) {
      const commitItem = checkCommitItems[layerId];
      canCommit = canCommit || !!commitItem.length
    }
    this.state.commit = canCommit;
    return this.state.commit;
  }

  /**
   * @returns true if we can undo
   */
  canUndo() {
    const steps = (this._states.length - 1) - this.getCurrentStateIndex();
    this.state.undo = !_.isNull(this._current) && (this._maxSteps > steps);
    return this.state.undo;
  }

  /**
   * @returns true if we can redo
   */
  canRedo() {
    this.state.redo = this.getLastState() && this.getLastState().id != this._current || _.isNull(this._current) && this._states.length > 0;
    return this.state.redo;
  }

  _getStatesToCommit() {
    return this._states.filter(state => state.id <= this._current);
  }

  /**
   * Get all changes to send to server 
   */
  commit() {
    const items = {};
    this
      ._getStatesToCommit()
      .forEach(state => {
        state.items
        .forEach(item => {
          let add = true;

          if (Array.isArray(item)) {
            item = item[1];
          }

          if(items[item.layerId]) {
            items[item.layerId]
              .forEach((commit, index) => {

                // check if already inserted feature
                if (commit.getUid() !== item.feature.getUid()) {
                  return;
                }

                if (item.feature.isNew() && !commit.isDeleted() && item.feature.isUpdated() ) {
                  const _item = item.feature.clone();
                  _item.add();
                  items[item.layerId][index] = _item;
                }
                
                else if (item.feature.isNew() && item.feature.isDeleted()) {
                  items[item.layerId].splice(index, 1);
                }
                
                else if (item.feature.isUpdated() || item.feature.isDeleted()) {
                  items[item.layerId][index] = item.feature;
                }

                add = false;

                return false;
              });
          }

          if (add && !(!item.feature.isNew() && item.feature.isAdded())) {
            items[item.layerId] = items[item.layerId] ? items[item.layerId] : [];
            items[item.layerId].push(item.feature);
          }

        });
      });

    return items;

  }

}