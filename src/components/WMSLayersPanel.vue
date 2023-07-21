<!--
  @file
  @since v3.7
-->

<template>
  <div v-disabled="loading">

    <bar-loader :loading="loading" />

    <h3 class="skin-color g3w-wms-panel-title">{{title}}</h3>

    <helpdiv v-if="abstract" :message="abstract" />

    <label for="g3w-wms-layers" v-t="'sidebar.wms.panel.label.layers'"></label>
    <select id="g3w-wms-layers" multiple="multiple" clear="true" v-select2="'selectedlayers'">
      <option v-for="layer in layers" :value="layer.name" :key="layer.name">{{layer.title}}</option>
    </select>

    <label for="g3w-wms-projections" v-t="'sidebar.wms.panel.label.projections'"></label>
    <select id="g3w-wms-projections" v-select2="'epsg'">
      <option v-for="projection in projections" :key="projection" :value="projection">{{projection}}</option>
    </select>

    <label for="g3w-wms-layer-name" v-t="'sidebar.wms.panel.label.name'"></label>
    <input class="form-control" id="g3w-wms-layer-name" v-model="name">

    <div v-if="added" class="g3w-wms-external-panel-layer-added-message" v-t="'sidebar.wms.layer_id_already_added'"></div>

    <layerspositions @layer-position-change="position=$event" :position="position" />

    <button @click.stop="addWMSlayer" v-disabled="0 === selectedlayers.length" class="btn wms-add-layer-button sidebar-button skin-button">
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
      loading: false,
      position: undefined,
      name: undefined,
      title: null,
      abstract: null,
      map_formats: [],
      info_formats: [],
      layers: [],
      selectedlayers: [],
      projections: [],
      epsg: null,
      added: false
    }
  },
  methods: {

    async addWMSlayer() {
      const config = {
        url:      this.url,
        name:     this.name && this.name.trim() || undefined,
        layers:   this.selectedlayers,
        epsg:     this.epsg,
        position: this.position
      };
      this.added = this.$options.service.checkIfWMSAlreadyAdded(config);
      if (this.added) {
        console.warn('WMS Layer already added');
        return;
      }
      try {
        this.loading = true;
        await this.$options.service.addWMSlayer(config);
      } catch(err) {
        console.warn('unexpected error while adding WMS Layer');
      } finally {
        this.loading = false;
      }      
      this.clear();
    },

    clear() {
      this.selectedlayers = [];
      this.name = null;
    },

    /**
     * @since 3.8.1
     */
    getLayersByEpsg(epsg) {
      return (null === epsg)
        ? this.$options.config.layers
        : this.layers.filter(({name}) => this.layerProjections[name].crss.indexOf(epsg) !== -1);
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
      wmsurl,
    } = this.$options.config;

    /**
     * URL of wms
     */
    this.url = wmsurl;

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
    layers.forEach(({name, crss, title }) => {
      this.layerProjections[name] = {
        crss: crss.map(crs => { /* try to check if projection */ Projections.get(crs); return `EPSG:${crs.epsg}`; }).sort(),
        title,
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
  .g3w-wms-panel-title{
    font-size: 1.2em;
    font-weight: bold;
    margin-bottom: 10px;
  }
  button.wms-add-layer-button {
    width: 100%;
    margin-top: 10px;
  }
  .g3w-wms-external-panel-layer-added-message{
    font-weight: bold;
    color: red;
    margin: 5px 0;
  }
</style>