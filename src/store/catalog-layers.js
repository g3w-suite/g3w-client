/**
 * @file State of legend items in Table of Contents (TOC) [aka. catalog layers]
 * @since v3.6
 */
import G3WObject from 'g3w-object';

/**
 * ORIGINAL SOURCE: src/app/core/layers/layersstoreregistry.js@v3.10.2
 */
export default new (class LayersStoresRegistry extends G3WObject {

  constructor() {
    super();

    this.stores      = {};

    this.storesArray = [];

    // to react some application components that are binding to Layerstore
    this.setters = {

      addLayersStore(store, idx) {
        const id        = store.getId();
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
          this.storesArray = this.storesArray.filter(i => id !== i);
          delete this.stores[id];
        }
      },

      removeLayersStores() {
        this.storesArray = [];
        this.stores      = {};
      },

    };
  }

  getLayerById(id) {
    return Object.values(this.stores).map(s => s.getLayerById(id)).find(l => l);
  }

  getLayers(filter) {
    return Object.values(this.stores).flatMap(s => s.getLayers(filter));
  }

  getQuerableLayersStores() {
    return this.getLayersStores().filter(s => s.isQueryable());
  }

  getLayersStore(id) {
    return this.stores[id];
  }

  getLayersStores() {
    return this.storesArray.map(id => this.stores[id]);
  }

});