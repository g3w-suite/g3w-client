<template>
  <div class="marker-results">
    <template v-for="(markers, provider) in providers">
      <h4 class="skin-color" style="font-weight: bold; font-size: 1.2em">{{provider}}</h4>
      <divider/>
      <marker-result-feature :marker="marker" v-for="marker in markers"/>
    </template>
  </div>
</template>

<script>

import MarkerResultFeature from "./MarkerResultFeature.vue";

export default {
  name: 'MarkerResults',
  components: {
      MarkerResultFeature
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
 .marker-results {
   background-color: #FFFFFF;
   overflow: auto;
   padding: 5px;
 }
</style>
