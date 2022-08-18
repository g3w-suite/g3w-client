<!-- ORIGINAL SOURCE: -->
<!-- gui/map/vue/map.html@v3.4 -->
<!-- gui/map/vue/map.js@v3.4 -->

<template>
<div :id="maps_container">

  <div v-for="hidemap in hidemaps"
       :id="hidemap.id"
       :key="hidemap.id"
       class="g3w-map hidemap">
  </div>

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

  <div id="map_footer" class="skin-border-color">

    <div id="map_footer_left" style="display: flex;" >
      <a href="https://g3wsuite.it/" style="margin-left: 5px; align-self: center;" target="_blank">
        <img height="15" src="/static/client/images/g3wsuite_logo.png" alt="">
      </a>
    </div>

    <div id="map_footer_right" style="display: flex;">
      <div id="scale-control"></div>
      <div v-if="mouse.switch_icon && !isMobile()" id="switch-mouse-coordinate" v-t-tooltip:top.create="mouse.tooltip" @click.stop.prevent="switchMapsCoordinateTo4326">
        <span class="skin-color hide-cursor-caret-color" :class="g3wtemplate.getFontClass('mouse')"></span>
      </div>
      <div v-show="!mouse.epsg_4326" id="mouse-position-control"></div>
      <div v-show="mouse.epsg_4326" id="mouse-position-control-epsg-4326"></div>
      <div v-if="showmapunits" id="scale-line-units">
        <select style="padding: 5px 2px; font-weight: bold; border:0; cursor: pointer" class="skin-color" v-model="mapunit">
          <option style="font-weight: bold" v-for="unit in service.state.mapunits" :value="unit" v-t="`sdk.mapcontrols.scaleline.units.${unit}`" :selected="mapunit === unit"></option>
        </select>
      </div>
      <div id="permalink" data-toggle="tooltip" data-placement="top" class="skin-tooltip-top" v-t-tooltip="'sdk.tooltips.copy_map_extent_url'"
           style="background-color: #eeeeee">
        <span class="skin-color" :class="g3wtemplate.getFontClass('link')" @click="createCopyMapExtentUrl"></span>
      </div>
    </div>

  </div>

</div>
</template>

<script>
import ApplicationState from 'core/applicationstate';
import AddLayerComponent from 'components/MapAddLayer.vue';

export default {
  data() {
    const {service, target} = this.$options;
    return {
      ready: false,
      target,
      mouse: {
        switch_icon: false,
        epsg_4326: false,
        tooltip: null
      },
      maps_container: this.$options.maps_container,
      service,
      mapunit: ApplicationState.map.unit,
      hidemaps: service.state.hidemaps,
      map_info: service.state.map_info,
    }
  },
  components: {
    'addlayer': AddLayerComponent
  },
  computed: {
    showmapunits(){
      return this.service.state.mapunits.length > 1;
    },
    mapcontrolsalignement() {
      return this.service.state.mapcontrolsalignement;
    },
    disableMapControls(){
      return this.service.state.mapControl.disabled;
    }
  },
  methods: {
    showHideControls () {
      const mapControls = this.$options.service.getMapControls();
      mapControls.forEach(control => control.type !== "scaleline" && control.control.showHide());
    },
    getPermalinkUrl() {
      return this.ready ? this.$options.service.getMapExtentUrl(): null;
    },
    createCopyMapExtentUrl(){
      const mapService = this.$options.service.createCopyMapExtentUrl();
    },
    switchMapsCoordinateTo4326(){
      this.mouse.epsg_4326 = !this.mouse.epsg_4326;
    }
  },
  watch: {
    'mapunit'(unit){
      ApplicationState.map.unit = unit;
      this.$options.service.changeScaleLineUnit(unit);
    }
  },
  async mounted() {
    const mapService = this.$options.service;
    mapService.once('ready', ()=> {
      this.ready = true;
      this.mouse.switch_icon = this.$options.service.getEpsg() !== 'EPSG:4326';
      this.mouse.tooltip = `ESPG ${this.$options.service.getCrs().split(':')[1]} <--> WGS84`;
    });
    this.crs = mapService.getCrs();
    await this.$nextTick();
    mapService.setMapControlsContainer($(this.$refs['g3w-map-controls']));
    $('#permalink').tooltip();
    // listen of after addHideMap
    mapService.onafter('addHideMap', async ({ratio, layers=[], mainview=false, switchable=false} = {}) => {
      await this.$nextTick();
      mapService._addHideMap({ratio, layers, mainview, switchable});
    });
  },
  destroyed() {
    this.service.clear();
  }
};
</script>