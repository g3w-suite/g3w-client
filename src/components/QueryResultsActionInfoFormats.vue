<!--
  @file
  @since v3.7
-->

<template>
  <select
    v-if           = "hasInfo"
    class          = "skin-color"
    v-select2      = "'infoformat'"
    :select2_value = "infoformat"
    :search        = "false"
  >
    <option
      v-for  = "format in infoformats"
      :key   = "format"
      :value = "format"
    >
      {{ format }}
    </option>
  </select>
</template>

<script>
import GUI                      from 'g3w-app';
import { Layer }                from 'g3w-layer';
import { getAlphanumericProps } from 'utils/getAlphanumericProps';
import { getCatalogLayerById }  from 'utils/getCatalogLayerById';

export default {
  name: 'Infoformats',

  props: {
    layer: {
      type:     Object,
      required: true
    }
  },

  data() {
    return {
      infoformat: this.layer.infoformat
    }
  },

  computed: {
    infoformats() {
      return this.layer.infoformats || [];
    },

    /**
     * Whether to show info formats for layer (eg. wms external layer).
     * 
     * @since 3.8.1
     */
    hasInfo() {
      return this.infoformats.length;
    }

  },

  watch: {
    async 'infoformat'(contenttype) {
      this.layer.loading = true;
      this.$el.disabled = true; // disable select while getting data from server
      try {
        const catalog_layer = getCatalogLayerById(this.layer.id);
        const response      = await catalog_layer.fetchProxyData('wms', { changes: {
          headers: { 'Content-Type': contenttype },
          params:  { INFO_FORMAT: contenttype }
        }});
        this.layer.infoformat = contenttype;
        catalog_layer.setInfoFormat(this.layer.infoformat);
        const [data] = Layer._parse(contenttype, { layers: [catalog_layer], response });

        // parse as raw data
        if (!data.features) {
          this.layer.features.splice(0);
          await this.$nextTick();
          this.layer.rawdata = data.rawdata;
        }

        // parse data
        if (data.features) {
          this.layer.rawdata = null;
          data.features.forEach(f => {
            const feature = {
              id:         f instanceof ol.Feature ? f.getId()         : f.id,
              attributes: f instanceof ol.Feature ? f.getProperties() : f.properties,
              geometry:   f instanceof ol.Feature ? f.getGeometry()   : f.geometry,
              show:       true,
            };
            // raw data (html) → set attributes to visualize it on result
            if (0 === this.layer.attributes.length) {
              this.layer.hasgeometry = !!feature.geometry;
              GUI.setActionsForLayers([this.layer]);
              getAlphanumericProps(feature.attributes).forEach(name => this.layer.attributes.push({ name, label: name, show: true }));
            }
            this.layer.features.push(feature);
          });
        }
      } catch (e) {
        console.warn(e);
      }
      this.layer.loading = false;
      this.$el.disabled = false;
    }
  },

  beforeDestroy() {
    getCatalogLayerById(this.layer.id)?.clearProxyData?.('wms');
  },

};
</script>
