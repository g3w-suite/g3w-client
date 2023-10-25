<template>
  <div class="marker-item">
    <section
      class="marker-tools skin-background-color lighten"
      style="width: 100%; padding: 3px;"
    >
      <!-- Zoom -->
      <span
         @contextmenu.prevent.stop=""
         @click.stop="zoom"
        :class="{'toggled': false }"
         class="action-button skin-tooltip-right"
      >
        <span
          style="padding: 2px;"
          class="action-button-icon"
          :class="g3wtemplate.getFontClass('marker')"></span>
      </span>

      <!-- Remove from markers -->
      <span
        @contextmenu.prevent.stop=""
        @click.stop="remove"
        :class="{'toggled': false }"
        class="action-button skin-tooltip-right"
      >
        <span
          style="padding: 2px;"
          class="action-button-icon"
          :class="g3wtemplate.getFontClass('trash')">
        </span>
      </span>

      <!-- Edit from markers -->
      <span
        v-if="poinEditableLayers.length > 0"
        @contextmenu.prevent.stop=""
        @click.stop="remove"
        :class="{'toggled': false }"
        class="action-button skin-tooltip-right"
      >
        <span
          style="padding: 2px;"
          class="action-button-icon"
          :class="g3wtemplate.getFontClass('pencil')">
        </span>
      </span>

      <span

        @contextmenu.prevent.stop=""
        @click.stop="toggle"
        :class="{'toggled': false }"
        style="margin-left: auto"
        class="action-button skin-tooltip-right"
      >
        <span
          style="padding: 2px;"
          class="action-button-icon"
          :class="g3wtemplate.getFontClass(open ? 'minus' : 'plus')">
        </span>
      </span>

    </section>
    <section class="marker-tooloftools">
      <div
        v-if="poinEditableLayers.length > 0"
        class="g3w-point-editable-layers"
        style="width: 100%; display: flex"
        @click.prevent.stop="">
        <select  style="flex-grow: 1" v-select2="'layerid'" :search="false" class="form-control">
          <option v-for="pointlayer in poinEditableLayers" :key="pointlayer.id" v-download :value="pointlayer.id">
            <span style="font-weight: bold">{{pointlayer.getName()}}</span>
          </option>
        </select>
        <button
          style="border-radius: 0 3px 3px 0;"
          class="btn skin-button" @click.stop=edit
        >
          <span :class="g3wtemplate.getFontClass('pencil')"></span>
        </button>
      </div>
    </section>
    <section class="marker-info" v-show="open">
      <div v-for="([key, value]) in Object.entries(marker) ">
          {{key }}
      </div>
      <divider/>
    </section>

  </div>

</template>

<script>
import { MarkersEventBus }   from 'app/eventbus';

import CatalogLayersStoresRegistry from 'store/catalog-layers';
import GUI                         from 'services/gui';


const { Geometry } = require('utils/geo');

export default {
  name: 'MarkerResultFeature',
  props: {
    marker: {
      type: Object,
      default: {}
    }
  },
  data() {
    return {
      layerid: null,
      open: true
    }
  },
  methods: {
    /**
     * Zoom to marker
     */
    zoom() {
      let {geometry, lon, lat}  = this.marker;
      geometry = geometry || new ol.geom.Point(ol.proj.transform([parseFloat(lon), parseFloat(lat)], 'EPSG:4326', GUI.getService('map').getEpsg()));
      GUI.getService('map').zoomToGeometry(geometry);
    },
    /**
     * Create new feature on layer point geometry
     */
    edit() {
      //@ŢODO
    },
    /**
    * Remove from marker results info
    */
    remove() {
      MarkersEventBus.$emit('remove-marker', this.marker.__uid);
    },
    /**
    * Toggle body
    */
    toggle() {
      this.open = !this.open;
    },
  },

  created() {
    //store point layer editable of the project
    this.poinEditableLayers = CatalogLayersStoresRegistry.getLayers({
      EDITABLE: true,
      GEOLAYER: true
    }).filter(l => Geometry.isPointGeometryType(l.getGeometryType()))
  }
};
</script>

<style scoped>
.marker-tools {
  display: flex;
  align-items: baseline;
}

</style>
