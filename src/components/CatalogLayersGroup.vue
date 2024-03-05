<!--
  @file
  @since v3.7
-->

<template>
  <div style="border: 1px solid #ffffff33; margin: 5px">
    <h4 style="margin: 5px; font-weight: bold">{{ layersgroup.title }}</h4>
    <catalog-tristate-tree
      v-for       = "node in layersgroup.nodes"  
      :layerstree = "node"
      class       = "item"
    />
  </div>
</template>

<script>
import CatalogTristateTree from 'components/CatalogTristateTree.vue';

export default {

  /** @since 3.8.6 */
  name: 'catalog-layers-group',

  components: {
    CatalogTristateTree,
  },

  props: {
    layersgroup: {
      type: Object
    }
  }
};
</script>