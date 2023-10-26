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
        <select
          v-select2="'layerId'"
          :search="false"
          style="flex-grow: 1"
          class="form-control">
          <option
            v-for="pointlayer in poinEditableLayers"
            :key="pointlayer.id"
            :value="pointlayer.id">
            <span style="font-weight: bold">{{pointlayer.name}}</span>
          </option>
        </select>
        <button
          style="border-radius: 0 3px 3px 0;"
          class="btn skin-button"
          @click.stop="edit"
        >
          <span :class="g3wtemplate.getFontClass('pencil')"></span>
        </button>
      </div>
    </section>
    <section v-if="showData" class="marker-info" v-show="open">
      <div v-for="([key, value]) in Object.entries(marker) ">
          {{key }}
      </div>
      <divider/>
    </section>

  </div>

</template>

<script>
import { MarkersEventBus }         from 'app/eventbus';
import { PluginsRegistry }           from "store";
import CatalogLayersStoresRegistry from 'store/catalog-layers';
import GUI                         from 'services/gui';


const { Geometry,
  singleGeometriesToMultiGeometry
} = require('utils/geo');

export default {
  name: 'MarkerResultFeature',
  props: {
    marker: {
      type: Object,
      default: {}
    },
    // TODO: make use only of `QueryResults.vue` to dump data
    showData: {
      type: Boolean,
      default: true,
    }
  },
  data() {
    return {
      layerId: null,
      open: true
    }
  },
  methods: {
    /**
     * Zoom to marker
     */
    zoom() {
      let {geometry, lon, lat}  = this.marker;
      //geometry coming from query result, lon lat from marker list info
      // TODO aligned all to feature (ol.Feature or Feature) is better
      geometry = geometry ||
        new ol.geom.Point(
          ol.proj.transform([parseFloat(lon), parseFloat(lat)],
          'EPSG:4326',
          GUI.getService('map').getEpsg())
        );
      GUI.getService('map').zoomToGeometry(geometry);
    },
    /**
     * Create new feature on layer point geometry
     */
    edit() {
      if (PluginsRegistry.getPlugin('editing')) {
        let geometry = new ol.geom.Point(
          ol.proj.transform([
              parseFloat(this.marker.lon),
              parseFloat(this.marker.lat)
            ],
            'EPSG:4326',
            GUI.getService('map').getEpsg())
        );
        //check if is Multi Geometry (MultiPoint)
        if (
          Geometry.isMultiGeometry(
            CatalogLayersStoresRegistry
              .getLayerById(this.layerId)
              .getGeometryType()
          )
        ) {
          //convert Point to MultiPoint Geometry
          geometry = singleGeometriesToMultiGeometry([geometry])
        }

        const feature = new ol.Feature({
          geometry,
          ...this.marker
        });
        PluginsRegistry
          .getPlugin('editing')
          .getApi()
          .addLayerFeature({
            layerId: this.layerId,
            feature
          })
      }
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
    })
    .filter(l => Geometry.isPointGeometryType(l.getGeometryType()))
    .map((l)=>({
      id:   l.getId(),
      name: l.getName(),
    }))
    if (this.poinEditableLayers.length > 0) {
      this.layerId = this.poinEditableLayers[0].id;
    }
  }
};
</script>

<style scoped>
.marker-tools {
  display: flex;
  align-items: baseline;
}

</style>
