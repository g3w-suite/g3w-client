/**
 * @file
 * @since v3.7
 */

import CatalogLayersStoresRegistry from 'store/catalog-layers';

export default {
  methods: {
    async autocompleteRequest({ layerId, field, value } = {}) {
      let data = [];
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      try {
        data = await layer.getFilterData({
          suggest: `${field}|${value}`,
          unique: field
        })
      } catch(e) {
        console.warn(e);
      }
      return data.map(value => ({ id:value, text:value }))
    }
  }
};