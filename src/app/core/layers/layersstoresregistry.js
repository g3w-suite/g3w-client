import G3WObject from 'core/g3wobject';

/**
 * Layers registry 
 */
export default class LayersStoresRegistry extends G3WObject {

  constructor() {

    super();

    this.stores      = {};
    this.storesArray = [];

    /**
     * to react some application components that are binding to Layerstore
     */
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
    return this.storesArray.map(storeId => this.stores[storeId]);
  }

  _addLayersStore(layersStore, idx) {
    const id = layersStore.getId();
    this.stores[id] = layersStore;
    if (!_.isNil(idx)) {
      this.storesArray.splice(idx, 0, id);
    } else {
      this.storesArray.push(id);
    }
  }

  _removeLayersStore(layerStore) {
    if (layerStore) {
      const id = layerStore.getId();
      this.storesArray = this.storesArray.filter((_id) => _id != id);
      delete this.stores[id];
    }
  }

  _removeLayersStores() {
    this.storesArray = [];
    this.stores = {};
  }

}