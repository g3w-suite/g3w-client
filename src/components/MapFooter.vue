<!-- 
  @since v3.7.0
-->

<template>
  <div id="map_footer" class="skin-border-color">
    <map-footer-left/>
    <map-footer-right :service="service"/>
  </div>
</template>

<script>
  import MapFooterRight from "./MapFooterRight.vue";
  import MapFooterLeft from "./MapFooterLeft.vue";
  export default {
    name: 'Mapfooter',
    props: {
      service: {
        type: Object
      }
    },
    components: {
      MapFooterRight,
      MapFooterLeft
    }
  };
</script>
