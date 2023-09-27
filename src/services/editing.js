/**
 * @file
 * @since v3.6
 */

//lass that is usefult to apply changes to features (undo/redo) singleton
function ChangesManager() {
  /**
   *
   * @param object
   * @param items
   * @param reverse
   * return object changes
   */
    this.execute = function(object, items, reverse) {
      let fnc;
      const changes = {}

      items.forEach(item => {
        const feature = item.feature;

        if (reverse) {
          // change to opposite
          feature[ChangesManager.Actions[feature.getState()].opposite]();
        }
        // get method from object
        fnc = ChangesManager.Actions[feature.getState()].fnc;
        object[fnc](feature);

        //check state of the feature add/delete/update
        if (undefined  === changes[feature.getState()]) {
          changes[feature.getState()] = [];
        }

        changes[feature.getState()].push(feature);
      })

      return changes;
    }
  }
  
  // know actions
  ChangesManager.Actions = {
    'add': {
      fnc: 'addFeature',
      opposite: 'delete'
    },
    'delete': {
      fnc: 'removeFeature',
      opposite: 'add'
    },
    'update': {
      fnc: 'updateFeature',
      opposite: 'update'
    }
};

export default new ChangesManager();