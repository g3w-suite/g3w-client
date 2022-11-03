<!-- ORIGINAL SOURCE: -->
<!-- gui/fields/geo.vue@v3.4 -->

<template>
  <div class="geo-content">
    <span @click.stop="showLayer()" class="show-hide-geo"
          :class="[visible ? g3wtemplate.font['eye-close'] : g3wtemplate.font['eye']]">
    </span>
  </div>
</template>

<script>
const { geoMixin } = require('gui/vue/vue.mixins');

export default {
  name: "g3w-geospatial",
  props: {
    data: {},
  },
  mixins: [geoMixin],
  data() {
    return {
      layerId: 'table_layer_' + Date.now(),
      visible: false,
      id: 'geo_table_' + Date.now()
    }
  }
};
</script>

<style scoped>
  .show-hide-geo {
    color: #3C8DBC;
    cursor: pointer;
    font-size: 1.2em;
  }

</style>
