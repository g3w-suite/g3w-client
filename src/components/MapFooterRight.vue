<!-- 
  @since v3.7.0
-->

<template>
  <div
    id    = "map_footer_right"
    style ="display: flex;"
  >
    <div id = "scale-control"></div>

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

    <div
      v-show = "mouse.visible"
      id     = "mouse-position-control">
    </div>

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
          [g3wtemplate.getFontClass('link')]: !urlCopied,
          [g3wtemplate.getFontClass('success')]: urlCopied,
        }"
        @click.stop = "createCopyMapExtentUrl">
    </div>

  </div>
</template>

<script>
  import ApplicationState from 'store/application';
  import { copyUrl }      from 'utils/copyUrl';

  export default {

    /** @since 3.8.6 */
    name: 'map-footer-right',

    props: {
      service: {
        type: Object
      }
    },
    data() {
      return {
        mouse: {
          visible:     true,
          switch_icon: false,
          epsg_4326:   false,
          tooltip:     null,
        },
        urlCopied: false,
        mapunit: ApplicationState.map.unit,
      }
    },
    computed: {
      showmapunits() {
        return this.service.state.mapunits.length > 1;
      }
    },
    methods: {
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
    }
  };
</script>

<style scoped>
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