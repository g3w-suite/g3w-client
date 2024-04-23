<!--
  @file
  @since v3.7
-->

<template>
  <div v-disabled="loading">

    <!-- LOADING INDICATOR -->
    <bar-loader :loading="loading" />

    <h3 class="skin-color g3w-wms-panel-title">{{ title }}</h3>

    <helpdiv
      v-if     = "abstract"
      :message = "abstract"
    />

    <!-- WMS LAYERS -->
    <label
      for = "g3w-wms-layers"
      v-t = "'sidebar.wms.panel.label.layers'"
    ></label>
    <select
      id        = "g3w-wms-layers"
      :multiple  = "true"
      clear     = "true"
      v-select2 = "'selectedlayers'"
    >
      <option
        v-for  = "layer in layers"
        :value = "layer.name"
        :key   = "layer.name"
      >{{layer.title}}</option>
    </select>

    <!-- WMS PROJECTION -->
    <label
      for = "g3w-wms-projections"
      v-t = "'sidebar.wms.panel.label.projections'"
    ></label>
    <select
      id        = "g3w-wms-projections"
      v-select2 = "'epsg'"
    >
      <option
        v-for  = "projection in projections"
        :key   = "projection"
        :value = "projection"
      >{{projection}}</option>
    </select>

    <!-- WMS NAME -->
    <label
      for = "g3w-wms-layer-name"
      v-t = "'sidebar.wms.panel.label.name'"
    ></label>
    <input
      class   = "form-control"
      id      = "g3w-wms-layer-name"
      v-model = "name"
    >

    <div
      v-if  = "added"
      class = "g3w-wms-external-panel-layer-added-message"
      v-t   = "'sidebar.wms.layer_id_already_added'"
    ></div>

    <!-- WMS POSITION -->
    <layerspositions
      @layer-position-change = "position=$event"
      :position              = "position"
    />

    <button
      @click.stop = "addWMSlayer"
      v-disabled  = "0 === selectedlayers.length"
      class       = "btn wms-add-layer-button sidebar-button skin-button"
    >
      <i style="font-weight: bold;" :class="g3wtemplate.getFontClass('plus-square')" ></i>
    </button>

  </div>
</template>

<script>
const Projections = require('g3w-ol/projection/projections');

export default {

  name: "wmpspanel",

  data() {
    return {
      loading:        false,      // loading reactive status
      position:       undefined,  // layer position on map
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
     * @returns {Promise<void>}
     */
    async addWMSlayer() {
      const config = {
        url:      this.url,
        name:     this.name && this.name.trim() || undefined,
        layers:   this.selectedlayers,
        epsg:     this.epsg,
        position: this.position,
      };

      this.added = this.$options.service.checkIfWMSAlreadyAdded(config);

      if (this.added) {
        console.warn('WMS Layer already added');
        return;
      }

      this.loading = true;

      try {
        await this.$options.service.addWMSlayer(config);
      } catch(err) {
        console.warn('unexpected error while adding WMS Layer');
      }

      this.loading = false;

      this.clear();
    },

    /**
     * @FIXME add description
     */
    clear() {
      this.selectedlayers = [];
      this.name = null;
    },

    /**
     * Get layers that has current selected epsg projection
     * 
     * @since 3.8.1
     */
    getLayersByEpsg(epsg) {
      return (null === epsg)
        ? this.$options.config.layers
        : this.layers.filter(({ name }) => -1 !== this.layerProjections[name].crss.indexOf(epsg));
    },

    /**
     * @since 3.8.1
     */
    getProjectionsByName(name) {
      return this.projections.filter((projection) => -1 !== this.layerProjections[name].crss.indexOf(projection));
    },

  },
  watch: {

    /**
     * Handle selected layers change  
     */
    selectedlayers(layers) {
      if (!layers.length) {             // Reset epsg and projections to initial values
        this.epsg        = null;
        this.projections = [];
      } else if (layers.length === 1) { // take first layer selected supported crss
        this.epsg        = this.layerProjections[layers[0]].crss[0];
        this.projections = this.layerProjections[layers[0]].crss;
      } else {                          // TODO: add description
        this.projections = this.getProjectionsByName(layers[layers.length -1]);;
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
    } catch(err) {
      console.warn(err);
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