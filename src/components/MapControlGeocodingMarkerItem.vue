<template>
  <div class="marker-item">
    <div v-for="([key, value]) in Object.entries(marker) ">{{key}}  {{value}}</div>
    <divider/>
  </div>

</template>

<script>
export default {
  name: 'MapControlGeocodingMarkerItem',
  props: {
    marker: {
      type: Object,
      default: {}
    }
  },
};
</script>
