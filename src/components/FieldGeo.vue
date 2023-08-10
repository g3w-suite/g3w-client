<!--
  @file
  @since v3.7
-->

<template>
  <div class="geo-content">
    <span
      @click.stop = "showLayer()"
      class       = "show-hide-geo"
      :class      = "[ g3wtemplate.font[visible ? 'eye-close' : 'eye'] ]"
    ></span>
  </div>
</template>

<script>
import { geoMixin } from 'mixins';

export default {

  name: "g3w-geospatial",

  props: {
    data: {},
  },

  mixins: [geoMixin],

  data() {
    return {
      layerId: 'table_layer_' + Date.now(),
      id:      'geo_table_' + Date.now(),
      visible: false,
    };
  },

};
</script>

<style scoped>
  .show-hide-geo {
    color: #3C8DBC;
    cursor: pointer;
    font-size: 1.2em;
  }

</style>
