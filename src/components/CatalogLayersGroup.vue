<!--
  @file
  @since v3.7
-->

<template>
  <div style="border: 1px solid #ffffff33; margin: 5px">
    <h4 style="margin: 5px; font-weight: bold">{{ layersgroup.title }}</h4>
    <tristate-tree
      v-for="node in layersgroup.nodes"  
      :layerstree="node"
      class="item"
    />
  </div>
</template>

<script>
export default {
  name: 'catalog-layers-group',
  props: {
    layersgroup: {
      type: Object
    }
  }
};
</script>