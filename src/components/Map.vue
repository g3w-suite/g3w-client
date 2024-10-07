<!--
  @file
  @since v3.7
-->

<template>
  <div id = "g3w-maps">

    <div
      v-for = "hidemap in hidemaps"
      :key  = "hidemap.id"
      :id   = "hidemap.id"
      class = "g3w-map hidemap"
    ></div>

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

      <!-- DIV that will contain marker on map -->
      <div style = "display: none;"><div id = "marker"></div></div>

      <!-- Add layer compnent -->
      <addlayer :service = "service" />

      <!-- @since 3.8.0   -->
      <div class="g3w-map-controls-left-bottom"></div>

    </div>

    <!-- Footer (bottom part) where scale and other component can be set -->
    <!-- ORIGINAL SOURCE: src/components/MapFooter.vue@v3.10.4 -->
    <!-- ORIGINAL SOURCE: src/components/MapFooterLeft.vue@v3.10.4 -->
    <!-- ORIGINAL SOURCE: src/components/MapFooterRight.vue@v3.10.4 -->
    <div id = "map_footer" class = "skin-border-color">

      <!-- MAP CREDITS -->
      <div
        id    = "map_footer_left"
        style = "display: flex;"
      >
        <a
          href   = "https://g3wsuite.it/"
          style  = "margin-left: 5px; align-self: center;"
          target = "_blank"
          :title = "version"
        >
          <img
            height = "15"
            src    = "/static/client/images/g3wsuite_logo.png"
            alt    = ""
          />
        </a>
      </div>

      <div
        id    = "map_footer_right"
        style ="display: flex;"
      >

        <!-- SCALE CONTROL -->
        <div id = "scale-control"></div>

        <!-- SWITCH COORDINATES  -->
        <div
          v-if                   = "mouse.visible && mouse.switch_icon && !isMobile()"
          id                     = "switch-mouse-coordinate"
          v-t-tooltip:top.create = "mouse.tooltip"
          @click.stop.prevent    = "switchMapsCoordinateTo4326"
        >
          <span
            class  = "skin-color-dark hide-cursor-caret-color"
            :class = "g3wtemplate.getFontClass('mouse')">
          </span>
        </div>

        <!-- MOUSE POSITION -->
        <div
          v-show = "mouse.visible"
          id     = "mouse-position-control"
        ></div>

        <div
          v-if = "showmapunits"
          id   = "scale-line-units"
        >
          <select
            style   = "padding: 5px 2px; font-weight: bold; border:0; cursor: pointer"
            class   = "skin-color-dark"
            v-model = "mapunit"
          >
            <option
              v-for     = "unit in service.state.mapunits"
              :value    = "unit"
              v-t       = "`sdk.mapcontrols.scaleline.units.${unit}`"
              :selected = "mapunit === unit"
              style     = "font-weight: bold">
            </option>
          </select>

        </div>

        <div
          id                     = "permalink"
          v-t-tooltip:top.create = "'sdk.tooltips.copy_map_extent_url'"
            class       = "skin-color-dark"
            :class      = "{
              [g3wtemplate.getFontClass('link')]:   !urlCopied,
              [g3wtemplate.getFontClass('success')]: urlCopied,
            }"
            @click.stop = "createCopyMapExtentUrl">
        </div>

      </div>
    </div>

  </div>
</template>

<script>
import ApplicationState from 'store/application';
import { copyUrl }      from 'utils/copyUrl';

import AddLayerComponent from 'components/MapAddLayer.vue';

export default {

  /** @since 3.8.6 */
  name: 'g3w-map',

  data() {
    const { service } = this.$options;
    return {
      target:         this.$options.service.target,
      hidemaps:       service.state.hidemaps,
      map_info:       service.state.map_info,
      service,
      mouse: {
        visible:     true,
        switch_icon: false,
        epsg_4326:   false,
        tooltip:     null,
      },
      urlCopied: false,
      mapunit:   ApplicationState.map.unit,
    }
  },

  components: {
    'addlayer': AddLayerComponent,
  },

  computed: {

    version() {
      return 'Powered by G3W-SUITE ' + initConfig.version;
    },

    showmapunits() {
      return this.service.state.mapunits.length > 1;
    },

    mapcontrolsalignement() {
      return this.service.state.mapcontrolsalignement;
    },

    disableMapControls() {
      return this.service.state.mapControl.disabled;
    },

  },

  methods: {

    showHideControls() {
      this.service.getMapControls().forEach(c => "scaleline" !== c.type && c.control.showHide());
    },

    createCopyMapExtentUrl() {
      const url = new URL(location.href);
      url.searchParams.set('map_extent', this.service.getMapExtent().toString());
      copyUrl(url.toString());
      this.urlCopied = !this.urlCopied;
      setTimeout(() => this.urlCopied = false, 5000);
    },

    switchMapsCoordinateTo4326() {
      this.mouse.epsg_4326 = !this.mouse.epsg_4326;
      this.service.getMapControlByType({ type: 'mouseposition'}).dispatchEvent({
        type: 'change:epsg',
        epsg: this.mouse.epsg_4326 ? 'EPSG:4326' : this.service.getEpsg(),
      })
    },

  },

  watch: {
    'mapunit'(unit) {
      ApplicationState.map.unit = unit;
      this.service.changeScaleLineUnit(unit);
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

    this.service.once('ready', () => {
      if (this.service.getMapControlByType({ type: 'mouseposition'})) {
        this.mouse.switch_icon = (
          this.service.getMapControlByType({ type: 'mouseposition'})
          && 'EPSG:4326' !== this.service.getEpsg()
        );
        this.mouse.tooltip = `ESPG ${this.service.getCrs().split(':')[1]} ↔ WGS84`;
      } else {
        this.mouse.visible = false;
      }
    });

  },

  destroyed() {
    this.service.clear();
  },

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
#map_footer {
  position:absolute;
  bottom:0;
  height: 30px;
  width:100%;
  display: flex;
  justify-content: space-between;
  background-color: rgba(255, 255, 255, 0.7);
}
#permalink {
  font-weight: bold;
  font-size: 1.2em;
  padding: 5px;
  cursor: pointer;
  background-color: #eee;
}
#switch-mouse-coordinate {
  display: flex;
  height: 100%;
  margin-left: 8px;
  align-items: center;
  cursor: pointer;
}
#switch-mouse-coordinate span {
  padding: 3px;
}
#map_footer_right {
  flex-shrink: 0;
}
</style>