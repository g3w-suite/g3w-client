<!-- ORIGINAL SOURCE: -->
<!-- app/gui/catalog/vue/components/layerlegend.vue@v3.4 -->

<template>
  <div v-show="show" class="layer-legend" @click.stop.prevent="">
    <bar-loader v-if="legend" :loading="legend.loading"></bar-loader>
    <figure>
      <template v-for="(legendurl, index) in legend.url" >
        <div style="display: flex; align-items: center; width: 100%" >
          <span v-didabled="!legendurl.ruleKey" v-if="layer.categories" @click.stop.prevent="showHideLayerCategory(index)" style="padding-right: 3px;" :class="g3wtemplate.getFontClass(legendurl.checked ? 'check': 'uncheck')"></span>
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
        CatalogLayersStoresRegistry.getLayerById(this.layer.id).change();
        this.legendplace === 'tab' && CatalogEventHub.$emit('layer-change-categories', this.layer);
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
      async getSingleLayerLegendCategories(layer) {
        const responseObject = {
          type: null,
          data: null
        };
        try {
          const legendurl = CatalogLayersStoresRegistry.getLayerById(layer.id).getLegendUrl(this.legendParams, {
            categories: true
          });
          const legendGraphics = await XHR.get({
            url: legendurl
          });
          const {nodes=[]} = legendGraphics;
          nodes.forEach(({icon, title, symbols=[]}) => {
            if (icon) {
              responseObject.type = 'icon';
              responseObject.data = {
                icon,
                title
              }
            } else {
              if (layer.categories) {
                symbols.forEach(symbol =>{
                  const findSymbol = layer.categories.find(({icon, title}) => symbol.icon === icon && symbol.title === title);
                  if (!findSymbol) {
                    symbol._checked = symbol.checked;
                    layer.categories.push(symbol);
                  }
                });
              } else layer.categories = symbols.map(symbol => ({
                ...symbol,
                _checked: symbol.checked
              }));
              responseObject.type = 'categories';
              responseObject.data = {
                categories: layer.categories
              }
            }
          });
        } catch(err){
          responseObject.type = 'error';
          responseObject.data = err;
        }
        return responseObject;
      },
      getLegendUrl(layer) {
        return CatalogLayersStoresRegistry.getLayerById(layer.id).getLegendUrl(this.legendParams);
      },
      async getLegendSrc(layer) {
        try {
          const layerLegendCategories = await this.getSingleLayerLegendCategories(layer);
          const {type, data={}} = layerLegendCategories;
          switch(type) {
            case 'icon':
              const {icon, title} = data;
              this.legend.url = [{
                icon: `data:image/png;base64,${icon}`,
                title,
                checked: true
              }];
              break;
            case 'categories':
              const {categories=[]} = data;
              this.legend.url = categories.map(({icon, title, checked=true, ruleKey}) => {
                return {
                  icon:`data:image/png;base64,${icon}`,
                  title,
                  checked,
                  ruleKey
                }
              });
              break;
          }

        } catch(err) {
          console.log(err)
        }
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