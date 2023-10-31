<template>
  <section class="marker-editing">
    <div
      v-if                = "layers.length > 0"
      class               = "g3w-point-editable-layers"
      style               = "width: 100%; display: flex"
      @click.prevent.stop = ""
    >
      <select
        v-select2 = "'layerId'"
        :search   = "false"
        style     = "flex-grow: 1;"
        class     = "form-control">
        <option
          v-for   = "layer in layers"
          :key    = "layer.id"
          :value  = "layer.id">
          <b>{{ layer.name }}</b>
        </option>
      </select>
      <button
        style       = "border-radius: 0 3px 3px 0;"
        class       = "btn skin-button"
        @click.stop = "edit"
      >
        <span :class="g3wtemplate.getFontClass('pencil')"></span>
      </button>
    </div>
  </section>
</template>

<script>
import { PluginsRegistry }         from "store";
import CatalogLayersStoresRegistry from 'store/catalog-layers';
import GUI                         from 'services/gui';

const { Geometry,
  singleGeometriesToMultiGeometry
} = require('utils/geo');


export default {
  name: 'choose_layer',

  props: {
    featureIndex: {
      type: Number,
    },
    feature: {
      type: Object
    },
    layer: {
      type: Object
    },
    config: {
      type: Object,
      default: null
    },
  },

  data() {
    return {
      layerId: null,
      open: true
    }
  },

  methods: {
    /**
     * Create new feature on layer point geometry
     */
     edit() {
      console.log(this.feature)
      if (PluginsRegistry.getPlugin('editing')) {
        PluginsRegistry
          .getPlugin('editing')
          .getApi()
          .addLayerFeature({
            layerId: this.layerId,
            feature: new ol.Feature({
              //check if is Multi Geometry (MultiPoint)
              geometry:  Geometry.isMultiGeometry(
                CatalogLayersStoresRegistry
                  .getLayerById(this.layerId)
                  .getGeometryType()) ?
                  singleGeometriesToMultiGeometry([this.feature.geometry]) :
                  this.feature.geometry,
              ...this.feature.attributes
            })
          })
      }
    },
  },

  created() {
    //store point layer editable of the project
    this.layers = CatalogLayersStoresRegistry.getLayers({
      EDITABLE: true,
      GEOLAYER: true
    })
    .filter(l => Geometry.isPointGeometryType(l.getGeometryType()))
    .map((l)=>({
      id:   l.getId(),
      name: l.getName(),
    }))
    if (this.layers.length > 0) {
      this.layerId = this.layers[0].id;
    }
  },

};
</script>