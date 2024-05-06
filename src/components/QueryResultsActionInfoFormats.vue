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
      v-for  = "infoformat in infoformats"
      :key   = "infoformat"
      :value = "infoformat"
    >
      {{infoformat}}
    </option>
  </select>
</template>

<script>
import CatalogLayersStoresRegistry              from 'store/catalog-layers';
import GUI                                      from 'services/gui';
import { getAlphanumericPropertiesFromFeature } from 'utils/getAlphanumericPropertiesFromFeature';

const { response:responseParser }              = require('utils/parsers');

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

  methods: {

    async reloadLayerDataWithChangedContentType(contenttype) {
      this.layer.loading = true;
      // disable select during get data from server
      this.$el.disabled = true;
      try {
        const response = await this.projectLayer.changeProxyDataAndReloadFromServer('wms', {
          headers: { 'Content-Type': contenttype },
          params:  { INFO_FORMAT: contenttype }
        });
        this.layer.infoformat = contenttype;
        this.projectLayer.setInfoFormat(this.layer.infoformat);
        const [data] = responseParser.get(contenttype)({ layers: [this.projectLayer], response });
        if (data.features) {
          this.__parsedata(data);
        } else {
          this.__parserawdata(data);
        }
      } catch (e) {
        console.warn(e);
      }
      this.layer.loading = false;
      // enable select during get data from server
      this.$el.disabled = false;
    },

    /**
     * @TODO find me a better name
     */
    __parsedata(data) {
      const queryService = GUI.getService('queryresults');
      this.layer.rawdata = null;

      data.features.forEach(feature => {
        const {
          id: fid,
          geometry,
          properties:attributes
        } = queryService.getFeaturePropertiesAndGeometry(feature);

        // in the case of starting raw data (html) need to sett attributes to visualize on a result
        if (0 === this.layer.attributes.length) {
          this.layer.hasgeometry = !!geometry;
          // need to setActionsForLayers to visualize eventual actions
          queryService.setActionsForLayers([this.layer]);
          getAlphanumericPropertiesFromFeature(attributes).forEach(name =>{
            this.layer.attributes.push({
              name,
              label:name,
              show: true
            })
          })
        }

        this.layer.features.push({ id: fid, attributes, geometry, show: true });
      });
    },

    /**
     * @TODO find me a better name 
     */
    async __parserawdata(data) {
      this.layer.features.splice(0);
      await this.$nextTick();
      this.layer.rawdata = data.rawdata;
    },

  },

  watch: {
    'infoformat'(value) {
      this.reloadLayerDataWithChangedContentType(value);
    }
  },

  created() {
    this.projectLayer = CatalogLayersStoresRegistry.getLayerById(this.layer.id);
  },

  beforeDestroy() {
    if (this.projectLayer) {
      this.projectLayer.clearProxyData('wms');
    }
    this.projectLayer = null;
  },

};
</script>
