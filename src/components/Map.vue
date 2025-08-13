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

    <div :id = "target" class = "g3w-map" @drop.prevent="onDrop" @dragenter.prevent="onDrop" @dragleave.prevent="onDrop" @dragover.prevent>

      <div class="drop-area" hidden>
        Upload Files
      </div>

      <!-- COMMON MAP CONTROLS (zoom, querybypolygon, geoscreeenshot, ...) -->
      <div
        ref   = "g3w-map-controls"
        class = "g3w-map-controls rv"
        style = "display: flex"
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

        <!-- SWITCH COORDINATES  -->
        <div
          v-if                = "mouse.visible && mouse.switch_icon && !isMobile()"
          id                  = "switch-mouse-coordinate"
          v-t-tooltip:top     = "mouse.tooltip"
          @click.stop.prevent = "switchMapsCoordinateTo4326"
        >
          <span
            class  = "skin-color-dark"
            :class = "$fa('mouse')"
            style  = "caret-color: rgba(0,0,0,0);"
          ></span>
        </div>

        <!-- MOUSE POSITION -->
        <div
          v-show = "mouse.visible"
          id     = "mouse-position-control"
        ></div>

        <div
          id              = "permalink"
          v-t-tooltip:top = "'Copy share URL'"
          :class          = "$fa('share-alt') + ' skin-color-dark'"
          @click.stop     = "showEmbedModal"
        ></div>

        <!-- SCALE CONTROL -->
        <div id = "scale-control"></div>

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
              v-t       = "`scaleline_units.${unit}`"
              :selected = "mapunit === unit"
              style     = "font-weight: bold">
            </option>
          </select>

        </div>

      </div>
    </div>

  </div>
</template>

<script>
import ApplicationState from 'g3w-state';
import { waitFor }      from 'utils/waitFor';

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

  computed: {

    version() {
      return 'Powered by G3W-SUITE ' + initConfig.version;
    },

    showmapunits() {
      return this.service.state.mapunits.length > 1;
    },

  },

  methods: {

    /**
     * @since 3.11.0
     */
    onDrop(e) {
      document.querySelector('.drop-area').toggleAttribute('hidden', 'dragenter' !== e.type);
      if (e.dataTransfer.files && 'drop' === e.type) {
        const q = document.querySelector.bind(document);
        // set modal options
        const setOption = async (el, value) => {
          el = '#modal-addlayer ' + el;
          await waitFor(() => q(el), 1000);
          q(el).value = value;
          q(el).dispatchEvent(new Event('input'));
          q(el).dispatchEvent(new Event('change'));
        }
        const setFile = async (file) => {
          await waitFor(() => !q('#add-layer-type').value, 5000);
          if (GUI.getLayerByName(file.name)) {
            return console.assert(!GUI.getLayerByName(file.name), `Unable to add layer: ${file.name}`);
          }
          setTimeout(() => console.assert(GUI.getLayerByName(file.name), `Unable to add layer: ${file.name}`), 2500);
          await setOption('#add-layer-type', 'file');
          await waitFor(() => q('#addcustomlayer input[type="file"]'), 1000);
          const data = new DataTransfer();
          data.items.add(file);
          q('#addcustomlayer input[type="file"]').files = data.files;
          q('#addcustomlayer input[type="file"]').dispatchEvent(new Event('change'));
          $('#modal-addlayer').modal('show');
        }
        setFile(e.dataTransfer.files[0]);
      }
    },

    showEmbedModal() {
      document.querySelector('.nav-embedmap').click();
    },

    switchMapsCoordinateTo4326() {
      this.mouse.epsg_4326 = !this.mouse.epsg_4326;
      this.service.getMapControlByType('mouseposition').dispatchEvent({
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

    this.service.once('ready', () => {
      if (this.service.getMapControlByType('mouseposition')) {
        this.mouse.switch_icon = (
          this.service.getMapControlByType('mouseposition')
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
  padding: 8px 5px 0 5px;
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
  padding: 3px 5px 0 3px;
}
#map_footer_right {
  flex-shrink: 0;
}

.drop-area:not([hidden]) {
  display: flex;
}

.drop-area {
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  color: #fff;
  font-size: 4em;
  position: absolute;
  z-index: 100;
  background-color: var(--bgcolor);
  pointer-events: none;
}

.drop-area::before {
  border: 5px dashed #fff;
  content: "";
  bottom: 60px;
  left: 60px;
  position: absolute;
  right: 60px;
  top: 60px;
}
</style>