<!-- ORIGINAL SOURCE: -->
<!-- app/gui/catalog/vue/components/layerlegend.vue@v3.4 -->

<template>
  <div v-show="show" class="layer-legend" @click.stop.prevent="">
    <bar-loader v-if="legend" :loading="legend.loading"></bar-loader>
    <figure>
      <template v-for="(legendurl, index) in legend.url" >
        <div style="display: flex; align-items: center; width: 100%" >
          <span v-didabled="!legendurl.ruleKey" v-if="layer.categories.length" @click.stop.prevent="showHideLayerCategory(index)" style="padding-right: 3px;" :class="g3wtemplate.getFontClass(legendurl.checked ? 'check': 'uncheck')"></span>
          <img v-if ="legendplace === 'toc'" :src="legendurl.icon" @error="setError()" @load="urlLoaded()">
          <span v-if="showCategoriesCheckBox" class="new_line_too_long_text" style="padding-left: 3px;">{{legendurl.title}}</span>
          <span class="divider"></span>
        </div>
      </template>
    </figure>
  </div>
</template>

<script>
  import CatalogEventHub from 'gui/catalog/vue/catalogeventhub';

  const ApplicationService = require('core/applicationservice');
  const CatalogLayersStoresRegistry = require('core/catalog/cataloglayersstoresregistry');
  const {XHR} = require('core/utils/utils');
  const GUI = require('gui/gui');

  export default {
    name: "layerlegend",
    props: {
      legendplace: {
        type: 'String'
      },
      layer: {
        type: Object
      }
    },
    data(){
      return {}
    },
    computed:{
      legend(){
        return this.layer.legend;
      },
      show(){
        return this.layer.visible && this.legend.show;
      },
      showCategoriesCheckBox(){
        return this.legend.url && this.legend.url.length > 1;
      }
    },
    methods: {
      showHideLayerCategory(index) {
        this.layer.categories[index].checked = this.legend.url[index].checked = !this.legend.url[index].checked;
       CatalogLayersStoresRegistry.getLayerById(this.layer.id).change()
      },
      setError() {
        this.legend.error = true;
        this.legend.loading = false;
      },
      async urlLoaded() {
        this.legend.loading = false;
      },
      handlerChangeLegend(options={}){
        const { layerId } = options;
        layerId === this.layer.id && this.getLegendSrc(this.layer);
      },
      getSingleLayerLegendCategories(layer) {
        const legendurl = CatalogLayersStoresRegistry.getLayerById(layer.id).getLegendUrl(this.legendParams, {
          categories: true
        });
        return XHR.get({
          url: legendurl
        })
      },
      getLegendUrl(layer) {
        return CatalogLayersStoresRegistry.getLayerById(layer.id).getLegendUrl(this.legendParams);
      },
      async getLegendSrc(layer) {
        try {
          const {nodes=[]} = await this.getSingleLayerLegendCategories(layer);
          nodes.forEach(({icon, title, symbols=[]}) => {
            //just icon no categories
            if (icon) {
              this.layer.categories = [];
              this.legend.url = [{
                icon: `data:image/png;base64,${icon}`,
                title,
                checked: true
              }];
            }
            else {
              this.layer.categories = [];
              this.legend.url = symbols.map(({icon, title, checked=true, ruleKey}) => {
                this.layer.categories.push({
                  checked,
                  ruleKey
                });
                return {
                  icon:`data:image/png;base64,${icon}`,
                  title,
                  checked,
                  ruleKey
                }
              })
            }

          })
        } catch(err) {}
      }
    },
    created() {
      this.legendParams = ApplicationService.getConfig().layout ? ApplicationService.getConfig().layout.legend : {};
      this.mapReady = false;
      CatalogEventHub.$on('layer-change-style', this.handlerChangeLegend);
      this.show && this.getLegendSrc(this.layer);
    },
    async mounted() {
      await this.$nextTick();
      const mapService = GUI.getService('map');
      mapService.on('change-map-legend-params', () => {
        this.mapReady = true;
        this.getLegendSrc(this.layer);
      });
    },
    beforeDestroy() {
      CatalogEventHub.$off('layer-change-style', this.handlerChangeLegend);
    }
  }
</script>

<style scoped>

</style>