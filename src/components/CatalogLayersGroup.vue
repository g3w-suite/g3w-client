<!-- ORIGINAL SOURCE: -->
<!-- gui/catalog/vue/layersgroup.html@v3.4 -->
<!-- gui/catalog/vue/catalog.js@v3.4 -->

<template>
  <div style="border: 1px solid #ffffff33; margin: 5px">
    <h4 style="margin: 5px; font-weight: bold">{{ layersgroup.title }}</h4>
    <tristate-tree  :layerstree="node" v-for="node in layersgroup.nodes" class="item">
    </tristate-tree>
  </div>
</template>

<script>
export default {
  props: {
    layersgroup: {
      type: Object
    }
  }
};
</script>