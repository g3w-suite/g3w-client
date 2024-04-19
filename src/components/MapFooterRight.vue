<!-- 
  @since v3.7.0
-->

<template>
  <div
    id    = "map_footer_right"
    style ="display: flex;"
  >
    <div id="scale-control"></div>

    <div
      v-if                   = "mouse.switch_icon && !isMobile()"
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
      v-show = "!mouse.epsg_4326"
      id     = "mouse-position-control">
    </div>

    <div
      v-show = "mouse.epsg_4326"
      id     = "mouse-position-control-epsg-4326">
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
      style                  = "background-color: #eeeeee"
    >
      <span
        class       = "skin-color-dark"
        :class      = "g3wtemplate.getFontClass('link')"
        @click.stop = "createCopyMapExtentUrl">
      </span>

    </div>

  </div>
</template>

<script>
  import ApplicationState from 'store/application-state';

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
          switch_icon: false,
          epsg_4326:   false,
          tooltip:     null
        },
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
        this.service.createCopyMapExtentUrl();
      },
      switchMapsCoordinateTo4326() {
        this.mouse.epsg_4326 = !this.mouse.epsg_4326;
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
        this.mouse.switch_icon = (
          this.service.getMapControlByType({ type: 'mouseposition'})
          && 'EPSG:4326' !== this.service.getEpsg()
        );
        this.mouse.tooltip = `ESPG ${this.service.getCrs().split(':')[1]} <--> WGS84`;
      });
    }
  };
</script>
