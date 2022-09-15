/**
 * ORIGINAL SOURCE: src/app/gui/vue/vue.mixins.js@v3.6
 */
const CatalogLayersStoresRegistry = require('core/catalog/cataloglayersstoresregistry');

export default {
  methods: {
    async autocompleteRequest({layerId, field, value}={}){
      let data = [];
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      try {
        data = await layer.getFilterData({
          suggest: `${field}|${value}`,
          unique: field
        })
      } catch(error) {}
      return data.map(value => ({
        id:value,
        text:value
      }))
    }
  }
};