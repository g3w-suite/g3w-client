<!--
  @file
  @since v3.7
-->

<template>
  <div v-disabled = "loading">

    <!-- LOADING INDICATOR -->
    <bar-loader :loading = "loading" />

    <h3 class = "skin-color g3w-wms-panel-title">{{title}}</h3>

    <helpdiv
      v-if     = "abstract"
      :message = "abstract"
    />

    <!-- LAYERS NAME   -->
    <label
      for = "g3w-wms-layers"
      v-t = "'sidebar.wms.panel.label.layers'">
    </label>
    <select
      id         = "g3w-wms-layers"
      :multiple  = "true"
      :clear     = "true"
      v-select2 = "'selectedlayers'"
    >
      <option
        v-for   = "layer in layers"
        :key    = "layer.name"
        :value  = "layer.name"
      >{{ layer.title }}</option>
    </select>

    <!-- EPSG PROJECTIONS   -->
    <label
      for = "g3w-wms-projections"
      v-t = "'sidebar.wms.panel.label.projections'">
    </label>
    <select
      id        = "g3w-wms-projections"
      v-select2 = "'epsg'"
    >
      <option
        v-for   = "projection in projections"
        :key    = "projection"
        :value  = "projection"
      >{{ projection }}</option>
    </select>

    <!-- NAME OF LAYER TO SAVE -->
    <label
      for = "g3w-wms-layer-name"
      v-t = "'sidebar.wms.panel.label.name'">
    </label>
    <input
      id      = "g3w-wms-layer-name"
      class   = "form-control"
      v-model = "name"
    >

    <div
      v-if  = "added"
      class = "g3w-wms-external-panel-layer-added-message"
      v-t   = "'sidebar.wms.layer_id_already_added'">
    </div>

    <!-- LAYER POSITION -->
    <div class = "form-group">
      <label for="position-layer" v-t = "'layer_position.message'"></label>
      <select class = "form-control" id = "position-layer" v-model = "position">
        <option :value = "'top'" v-t = "'layer_position.top'"></option>
        <option :value = "'bottom'" v-t = "'layer_position.bottom'"></option>
      </select>
    </div>

    <button
      @click.stop = "$emit('add-wms-layer', { url, position, epsg, layers: selectedlayers, name: name && name.trim() || undefined })"
      v-disabled  = "0 === selectedlayers.length"
      class       = "btn wms-add-layer-button sidebar-button skin-button"
    >
      <i
        style  = "font-weight: bold;"
        :class = "$fa('plus-square')" >
      </i>
    </button>

  </div>
</template>

<script>
import Projections from 'store/projections';

export default {

  name: "wmpspanel",

  data() {
    return {
      loading:        false,      // loading reactive status
      position:       'top',      // layer position on map
      name:           undefined,  // name of saved layer
      title:          null,       // title of layer
      abstract:       null,       // abstract
      map_formats:    [],         // map formats
      info_formats:   [],         // info formats
      methods:        [],         // @since 3.9.0
      layers:         [],         // Array of layers
      selectedlayers: [],         // Selected layers
      projections:    [],         // projections
      epsg:           null,       // choose epsg project
      added:          false,      // added layer (Boolean)
    };
  },

  methods: {

    /**
     * @FIXME add description
     */
    clear() {
      this.selectedlayers = [];
      this.name           = null;
      this.loading        = false;
    },

    /**
     * Get layers that has current selected epsg projection
     * 
     * @since 3.8.1
     */
    getLayersByEpsg(epsg) {
      return (null === epsg)
        ? this.$options.config.layers
        : this.layers.filter(({ name }) => this.layerProjections[name].crss.includes(epsg));
    },

    /**
     * @since 3.8.1
     */
    getProjectionsByName(name) {
      return this.projections.filter(p => this.layerProjections[name].crss.includes(p));
    },

  },
  watch: {

    /**
     * Handle selected layers change  
     */
    selectedlayers(layers = []) {
      if (0 === layers.length) {             // Reset epsg and projections to initial values
        this.epsg        = null;
        this.projections = [];
      } else if (1 === layers.length) { // take first layer selected supported crss
        this.epsg        = this.layerProjections[layers[0]].crss[0];
        this.projections = this.layerProjections[layers[0]].crss;
      } else {                          // TODO: add description
        this.projections = this.getProjectionsByName(layers[layers.length -1]);
      }
    },

    /**
     * @returns { Promise<void> }
     */
    async epsg() {
      await this.$nextTick();
      this.layers = this.getLayersByEpsg(this.epsg);
    },

  },

  async created() {
    const {
      layers,
      title,
      abstract,
      methods, // @since 3.9.0
      wmsurl,
    } = this.$options.config;

    /**
     * URL of wms
     */
    try {
      this.url = methods.GetMap.urls.find(u => 'Get' === u.type).url;
    } catch(e) {
      console.warn(e);
      this.url = wmsurl;
    }

    /**
     * Title of wms
     */
     this.title = title;
    
    /**
     * Abstract of wms
     */
    this.abstract = abstract;

    /**
     * Store for each layer name projection info
     */
    this.layerProjections = {};

    layers
      .forEach(({ name, crss, title }) => {
        this.layerProjections[name] = {
          title,
          crss: crss.map(crs => { /* try to check if projection */ Projections.get(crs); return `EPSG:${crs.epsg}`; }).sort(),
        };
      });

    /**
     * Layers of wms
     */
    this.layers = layers;

  },

  beforeDestroy() {
    this.$data = null;
  },

};
</script>

<style scoped>
  .g3w-wms-panel-title {
    font-size: 1.2em;
    font-weight: bold;
    margin-bottom: 10px;
  }
  button.wms-add-layer-button {
    width: 100%;
    margin-top: 10px;
  }
  .g3w-wms-external-panel-layer-added-message {
    font-weight: bold;
    color: red;
    margin: 5px 0;
  }
</style>