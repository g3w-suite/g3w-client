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
     * 
     * @TODO replace it with class fields (upgrade babel version and remove the followings)
     */
    this.setters = {
      addLayersStore:     this._addLayersStore.bind(this),
      removeLayersStore:  this._removeLayersStore.bind(this),
      removeLayersStores: this._removeLayersStores.bind(this),
    };
    this._setupListenersChain(this.setters);

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
    let layers = [];
    Object
      .entries(this.stores)
      .forEach(([id, store]) => { layers = layers.concat(store.getLayers(filter)); });
    return layers;
  }

  getQuerableLayersStores() {
    return this.getLayersStores().filter((store) => store.isQueryable());
  }

  getLayersStore(id) {
    return this.stores[id];
  }

  getLayersStores() {
    const stores = [];
    this.storesArray.forEach((id) => { stores.push(this.stores[id]); });
    return stores;
  }

  _addLayersStore(layersStore, idx) {
    const id = layersStore.getId();
    this.stores[id] = layersStore;
    if (!_.isNil(idx)) {
      this.storesArray.splice(idx,0, id);
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