<template>
  <div v-disabled="loading">
    <bar-loader :loading="loading"></bar-loader>
    <h3 class="skin-color g3w-wms-panel-title">{{title}}</h3>
    <helpdiv v-if="abstract" :message="abstract"></helpdiv>
    <layerspositions style="margin-top: 5px; display: flex; justify-content: space-between" @layer-position-change="position=$event" :position="position"></layerspositions>
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
    <div v-if="added" class="g3w-wms-external-panel-layer-added-message" v-t="'sidebar.wms.layer_id_already_added'">
    </div>
    <button @click.stop="addWMSlayer" v-disabled="selectedlayers.length === 0" class="btn wms-add-layer-buttom sidebar-button skin-button">
      <i style="font-weight: bold;" :class="g3wtemplate.getFontClass('plus-square')" ></i>
    </button>
  </div>
</template>

<script>
  const Projections = require('g3w-ol/src/projection/projections');
  export default {
    name: "wmpspanel",
    data(){
      return {
        laoding: false,
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
      async addWMSlayer(){
        const config = {
          url: this.url,
          name: this.name && this.name.trim() || undefined,
          layers: this.selectedlayers,
          epsg: this.epsg,
          position: this.position
        };
        ///pre
        this.added = this.$options.service.checkIfWMSAlreadyAdded(config);
        if (!this.added){
          this.loading = true;
          try {
            await this.$options.service.addWMSlayer(config);
          } catch(err){}
          this.loading = false;
          this.clear();
        }
      },
      clear(){
        this.selectedlayers = [];
        this.name = null;
      },
      //filter layer based on current epsg
      filterLayerByCurrentEpsg(){
        this.layers = this.layers.filter(({name}) => this.layerProjections[name].crss.indexOf(this.epsg) !== -1);
      }
    },
    watch: {
      // when chanhe selected layers
      selectedlayers(layers){
        if (layers.length) {
          const firstLayer = layers[0];
          if (layers.length === 1) {
            this.epsg = this.layerProjections[firstLayer].crss[0];
            this.projections = this.layerProjections[firstLayer].crss;
          } else this.projections = this.projections.filter(projection => this.layerProjections[layers[layers.length -1]].crss.index(projection) !== -1);
        } else {
          this.epsg = null;
          this.projections.splice(0);
          this.layers = Object.keys(this.layerProjections).map(name => ({
            name,
            title: this.layerProjections[name].title
          }));
        }
      },
      async epsg(){
        await this.$nextTick();
        this.filterLayerByCurrentEpsg();
      }
    },
    async created() {
      const {layers, title, abstract, wmsurl:url} = this.$options.config;
      this.layerProjections = {};
      this.url = url;
      layers.forEach(layer => {
        // store for each layer projection epsg with title that i use
        this.layerProjections[layer.name] = {
          crss: layer.crss.map(crs => {
            // try to check if projection
            Projections.get(crs);
            return `EPSG:${crs.epsg}`;
          }).sort(),
          title: layer.title
        };
        this.layers.push(layer)
      });
      // title of wms
      this.title = title;
      // abstract of wms
      this.abstract = abstract;
    },
    beforeDestroy() {
      this.$data = null;
    }
  }
</script>

<style scoped>
  .g3w-wms-panel-title{
    font-size: 1.2em;
    font-weight: bold;
    margin-bottom: 10px;
  }
  button.wms-add-layer-buttom{
    width: 100%;
    margin-top: 10px;
  }
  .g3w-wms-external-panel-layer-added-message{
    font-weight: bold;
    color: red;
    margin: 5px 0;
  }
</style>