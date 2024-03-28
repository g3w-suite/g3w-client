import G3WObject from 'core/g3w-object';

// Registy Layers
module.exports = (class LayersStoresRegistry extends G3WObject {

  constructor() {
    super();

    this.stores = {};

    this.storesArray = [];

    // to react some application components that are binding to Layerstore
    this.setters = {

      addLayersStore(store, idx) {
        const id = store.getId();
        this.stores[id] = store;
        if (null !== idx && undefined !== idx) {
          this.storesArray.splice(idx, 0, id);
        } else {
          this.storesArray.push(id);
        }
      },

      removeLayersStore(store) {
        if (store) {
          const id = store.getId();
          this.storesArray = this.storesArray.filter(i => i != id);
          delete this.stores[id];
        }
      },

      removeLayersStores() {
        this.storesArray = [];
        this.stores = {};
      },

    };
  }

  getLayerById(id) {
    return Object.values(this.stores).map(store => store.getLayerById(id)).find(layer => layer);
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

});