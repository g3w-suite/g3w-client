// Class that is usefult to apply changes to features (undo/redo) singleton
class ChangesManager {
  constructor() {}

  execute(object, items, reverse) {
    let fnc;
    let feature;
    items.forEach((item) => {
      feature = item.feature;
      if (reverse) {
        // change to opposite
        feature[ChangesManager.Actions[feature.getState()].opposite]();
      }
      // get method from object
      fnc = ChangesManager.Actions[feature.getState()].fnc;
      object[fnc](feature);
    });
  }

  // class attribute
  static Actions = {
    add: {
      fnc: 'addFeature',
      opposite: 'delete',
    },
    delete: {
      fnc: 'removeFeature',
      opposite: 'add',
    },
    update: {
      fnc: 'updateFeature',
      opposite: 'update',
    },
  };
}

export default new ChangesManager();
