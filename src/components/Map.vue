<!--
  @file
  @since v3.7
-->

<template>
  <div :id = "maps_container">

    <div
      v-for = "hidemap in hidemaps"
      :key  = "hidemap.id"
      :id   = "hidemap.id"
      class = "g3w-map hidemap"></div>

    <div :id = "target" class = "g3w-map">

      <!-- COMMON MAP CONTROLS (zoom, querybypolygon, geoscreeenshot, ...) -->
      <div
        ref        = "g3w-map-controls"
        class      = "g3w-map-controls"
        style      = "display: flex"
        v-disabled = "disableMapControls"
        :class     = "mapcontrolsalignement"
      ></div>

      <!-- FIXME: add description -->
      <div
        v-if   = "map_info.info"
        ref    = "g3w-map-info"
        id     = "g3w-map-info"
        :style = "map_info.style"
      >
        {{map_info.info}}
      </div>

      <!-- DIV that will contain marker on ma-->
      <div style = "display: none;"><div id = "marker"></div></div>

      <!-- Add layer compnent -->
      <addlayer :service = "service" />

      <!-- @since 3.8.0   -->
      <div class="g3w-map-controls-left-bottom"></div>

    </div>

    <!-- Footer (bottom part) where scale and other component can be set -->
    <map-footer :service="service"/>

  </div>
</template>

<script>
import AddLayerComponent from 'components/MapAddLayer.vue';
import MapFooter         from 'components/MapFooter.vue';

export default {

  /** @since 3.8.6 */
  name: 'g3w-map',

  data() {
    const { service } = this.$options;
    return {
      target:         this.$options.service.target,
      maps_container: this.$options.service.maps_container,
      hidemaps:       service.state.hidemaps,
      map_info:       service.state.map_info,
      service,
    }
  },
  components: {
    'addlayer': AddLayerComponent,
    MapFooter
  },
  computed: {
    mapcontrolsalignement() {
      return this.service.state.mapcontrolsalignement;
    },
    disableMapControls() {
      return this.service.state.mapControl.disabled;
    }
  },
  methods: {
    showHideControls() {
      this.service.getMapControls().forEach(c => "scaleline" !== c.type && c.control.showHide());
    }
  },
  async mounted() {
    this.crs = this.service.getCrs();
    await this.$nextTick();
    this.service.setMapControlsContainer($(this.$refs['g3w-map-controls']));
    // listen of after addHideMap
    this.service.onafter('addHideMap', async ({ratio, layers=[], mainview=false, switchable=false} = {}) => {
      await this.$nextTick();
      this.service._addHideMap({ratio, layers, mainview, switchable});
    });
  },
  destroyed() {
    this.service.clear();
  }
};
</script>
<style scoped>
#marker {
  width: 15px;
  height: 15px;
  border: 2px solid yellow;
  border-radius: 10px;
  background-color: yellow;
  opacity: 0.8;
}
.g3w-map-controls-left-bottom {
  position: absolute;
  bottom: 75px;
  left: 10px;
  z-index: 1;
}
#g3w-map-info {
  position: absolute;
  top: 60px;
  left: 5px;
  font-weight: bold;
  z-index: 100;
  background: rgba(255,255,255, 0.6);
  padding: 5px;
  border-radius: 3px;
}
#g3w-maps {
  position: relative;
  width: 100%;
  height: 100%;
}
.g3w-map {
  position: absolute;
  width: 100%;
  height: 100%;
}
.g3w-map.show {
  display: block;
}
.g3w-map.hide {
  display: none;
} 
</style>