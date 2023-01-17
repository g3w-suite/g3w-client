<!--
  @file
  @since v3.7
-->

<template>
<div :id="maps_container">

  <div v-for="hidemap in hidemaps" :id="hidemap.id" :key="hidemap.id" class="g3w-map hidemap"></div>

  <div :id="target" class="g3w-map">
    <div class="g3w-map-controls" style="display: flex" v-disabled="disableMapControls" ref="g3w-map-controls" :class="mapcontrolsalignement"></div>
    <div id="g3w-map-info" ref="g3w-map-info" :style="map_info.style" v-if="map_info.info">
      {{map_info.info}}
    </div>
    <div style="display: none;">
      <div id="marker"></div>
    </div>
    <addlayer :service="service"></addlayer>
  </div>

  <map-footer :service="service"/>

</div>
</template>

<script>
import AddLayerComponent from 'components/MapAddLayer.vue';
import MapFooter from 'components/MapFooter.vue';

export default {
  data() {
    const {service, target} = this.$options;
    return {
      target,
      maps_container: this.$options.maps_container,
      service,
      hidemaps: service.state.hidemaps,
      map_info: service.state.map_info,
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
    disableMapControls(){
      return this.service.state.mapControl.disabled;
    }
  },
  methods: {
    showHideControls () {
      const mapControls = this.service.getMapControls();
      mapControls.forEach(control => control.type !== "scaleline" && control.control.showHide());
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