/**
 * @file
 * @since v3.7
 */

import { getCatalogLayerById } from 'utils/getCatalogLayerById';

export default {
  methods: {
    async autocompleteRequest({ layerId, field, value } = {}) {
      let data = [];
      try {
        data = await getCatalogLayerById(layerId).getFilterData({
          suggest: `${field}|${value}`,
          unique:  field
        })
      } catch(e) {
        console.warn(e);
      }
      return data.map(value => ({ id: value, text: value }))
    }
  }
};