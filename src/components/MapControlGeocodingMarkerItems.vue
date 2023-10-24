<template>
  <div class="marker-items">
    <template v-for="provider in Object.keys(providers)">
      <h4 class="skin-color" style="font-weight: bold">{{provider}}</h4>
      <map-control-geocoding-marker-item :marker="marker" v-for="marker in providers[provider]"/>
    </template>
  </div>
</template>

<script>

import MapControlGeocodingMarkerItem from "./MapControlGeocodingMarkerItem.vue";
export default {
  name: 'MapControlGeocodingMarkerItems',
  components: {
    MapControlGeocodingMarkerItem
  },
  props: {
    markers: {
      type: Array,
      default: []
    }
  },
  computed: {
    providers() {
      return this.markers.reduce((accumulator, marker) => {
        if (undefined === accumulator[marker.provider]) {
          accumulator[marker.provider] = [];
        }
        accumulator[marker.provider].push(marker);
        return accumulator;
      }, {})
    }
  }
};
</script>

<style scoped>
 .marker-items {
   background-color: #FFFFFF;
   overflow: auto;
 }
</style>
