import G3WObject from 'core/g3wobject';

class LayersStoresRegistry extends G3WObject{
  constructor() {
    super({
      setters: {
        addLayersStore(layersStore, idx) {
          this._addLayersStore(layersStore, idx);
        },
        removeLayersStore(layerStore) {
          this._removeLayersStore(layerStore);
        },
        removeLayersStores() {
          this._removeLayersStores();
        }
      }
    });
    this.stores = {};
    this.storesArray = [];
  }

  getLayerById(layerId) {
    let layer;
    for (const storeId in this.stores) {
      const layerStore = this.stores[storeId];
      layer = layerStore.getLayerById(layerId);
      if (layer) break;
    }
    return layer
  };

  getLayers(filter) {
    let layers = [];
    Object.entries(this.stores).forEach(([storeId, layersStore]) => {
      layers = layers.concat(layersStore.getLayers(filter))
    });
    return layers;
  };

  getQuerableLayersStores() {
    return this.getLayersStores().filter((layersStore) => {
      return layersStore.isQueryable();
    })
  };

  getLayersStore(id) {
    return this.stores[id];
  };

  getLayersStores() {
    const stores = [];
    this.storesArray.forEach((storeId) => {
      stores.push(this.stores[storeId]);
    });
    return stores;
  };

  _addLayersStore(layersStore, idx) {
    const storeId = layersStore.getId();
    this.stores[storeId] = layersStore;
    if (!_.isNil(idx)) this.storesArray.splice(idx,0, storeId);
    else this.storesArray.push(storeId);

  };

  _removeLayersStore(layerStore) {
    if (layerStore) {
      const storeId = layerStore.getId();
      this.storesArray = this.storesArray.filter(_storeId => _storeId != storeId);
      delete this.stores[storeId];
    }
  };

  _removeLayersStores() {
    this.storesArray = [];
    this.stores = {};
  };
}

export default  LayersStoresRegistry;
