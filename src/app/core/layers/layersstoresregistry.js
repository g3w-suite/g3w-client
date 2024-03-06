import G3WObject from 'core/g3w-object';

// Registy Layers
module.exports = (class LayersStoresRegistry extends G3WObject {

  constructor() {
    super();

    this.stores = {};

    this.storesArray = [];

    // to react some application components that are binding to Layerstore
    this.setters = {
      addLayersStore:     this._addLayersStore.bind(this),
      removeLayersStore:  this._removeLayersStore.bind(this),
      removeLayersStores: this._removeLayersStores.bind(this),
    };
  }

  getLayerById(layerId) {
    let layer;
    for (const id in this.stores) {
      layer = this.stores[id].getLayerById(layerId);
      if (layer) break;
    }
    return layer
  }

  getLayers(filter) {
    return Object.values(this.stores).flatMap(store => store.getLayers(filter));
  }

  getQuerableLayersStores() {
    return this.getLayersStores().filter(store => store.isQueryable());
  }

  getLayersStore(id) {
    return this.stores[id];
  }

  getLayersStores() {
    return this.storesArray.map(id => this.stores[id]);
  }

  _addLayersStore(store, idx) {
    const id = store.getId();
    this.stores[id] = store;
    if (!_.isNil(idx)) this.storesArray.splice(idx, 0, id);
    else this.storesArray.push(id);
  }

  _removeLayersStore(store) {
    if (store) {
      const id = store.getId();
      this.storesArray = this.storesArray.filter(i => i != id);
      delete this.stores[id];
    }
  }

  _removeLayersStores() {
    this.storesArray = [];
    this.stores = {};
  }

});