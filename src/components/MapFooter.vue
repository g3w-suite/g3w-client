<!-- 
  @since v3.7.0
-->

<template>
  <div id = "map_footer" class = "skin-border-color">
    <map-footer-left/>
    <map-footer-right :service = "service"/>
  </div>
</template>

<script>
  import MapFooterRight from 'components/MapFooterRight.vue';
  import MapFooterLeft  from 'components/MapFooterLeft.vue';

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

<style scoped>
#map_footer {
  position:absolute;
  bottom:0;
  height: 30px;
  width:100%;
  display: flex;
  justify-content: space-between;
  background-color: rgba(255, 255, 255, 0.7);
}
</style>
