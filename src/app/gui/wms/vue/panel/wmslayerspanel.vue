<template>
  <div v-disabled="loading">
    <bar-loader :loading="loading"></bar-loader>
    <label for="g3w-wms-projects" v-t="'sidebar.wms.panel.label.projections'"></label>
    <select id="g3w-wms-projects" v-select2="'epsg'">
      <option v-for="projection in projections" :value="projection">{{projection}}</option>
    </select>
    <label for="g3w-wms-layers" v-t="'sidebar.wms.panel.label.layers'"></label>
    <select id="g3w-wms-layers" multiple="multiple" v-select2="'selectedlayers'">
      <option v-for="layer in layers" :value="layer.id" :key="layer.id">{{layer.name}}</option>
    </select>
    <button @click.stop="addWMSlayerToMap" v-disabled="selectedlayers.length === 0" class="btn wms-add-layer-buttom sidebar-button skin-button">
      <i style="font-weight: bold;" :class="g3wtemplate.getFontClass('plus-square')" ></i>
    </button>
  </div>
</template>

<script>
  import {EPSG} from '../../../../constant';
  export default {
    name: "wmpspanel",
    data(){
      return {
        loading: true,
        layers: [],
        selectedlayers: [],
        epsg: EPSG[0],
        position: 'top'
      }
    },
    methods: {
      addWMSlayerToMap(){
        this.$options.service.addWMSlayerToMap({
          url: this.$options.wmsurl,
          layers: this.selectedlayers
        })
      }
    },
    async created() {
      this.projections = EPSG;
      this.loading = true;
      try {
        const layers = await this.$options.service.getWMSLayers(this.$options.wmsurl);
        layers.forEach(layer => this.layers.push(layer));
      }
      catch(err){}
      this.loading = false;
    }
  }
</script>

<style scoped>
  button.wms-add-layer-buttom{
    width: 100%;
    margin-top: 10px;
  }
</style>