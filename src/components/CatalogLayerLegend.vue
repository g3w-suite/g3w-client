<!-- ORIGINAL SOURCE: -->
<!-- app/gui/catalog/vue/components/layerlegend.vue@v3.4 -->

<template>
  <div v-show="show" class="layer-legend" @click.stop.prevent="">
    <bar-loader v-if="legend" :loading="legend.loading"></bar-loader>
    <figure>
      <template v-for="(legendurl, index) in legend.url" >
        <div style="display: flex; align-items: center; width: 100%" v-disabled="isDisabled(index)">
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
      isDisabled(index){
        return this.layer.categories ? this.layer.categories[index].disabled : false;
      },
      showHideLayerCategory(index) {
        this.layer.categories[index].checked = this.legend.url[index].checked = !this.legend.url[index].checked;
        CatalogLayersStoresRegistry.getLayerById(this.layer.id).change();
        if (this.legendplace === 'tab') CatalogEventHub.$emit('layer-change-categories', this.layer);
        else if (this.layer.categories[index].checked && this.mapReady) {
          this.disableAddCategories(this.layer);
        }
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
      async disableAddCategories(layer){
        try {
          const legendurl = CatalogLayersStoresRegistry.getLayerById(layer.id).getLegendUrl(this.legendParams, {
            categories: true
          });
          const legendGraphics = await XHR.get({
            url: legendurl
          });
          const {nodes=[]} = legendGraphics;
          if (nodes.length) {
            nodes.forEach(({icon, title, symbols=[]}) => {
              if (layer.categories) {
                if (symbols.length < layer.categories.length){
                  /**
                   * In case of only one symbol, getLegendGraphic return icon and title
                   */
                  if (icon && symbols.length === 0) symbols.push({
                    title,
                    icon
                  });
                  layer.categories.forEach(category => {
                    if (category.checked) {
                      const findCategory = symbols.find(symbol => symbol.title === category.title && symbol.icon === category.icon);
                      category.disabled = !findCategory;
                    }
                  })
                  /*
                  * */
                } else layer.categories.forEach(category => category.disabled = false);
              } else {
                // in case of double legend per layer
                // it is possible that a legend (charts) is associated to layer
                // but only one icon legend is used
                if (icon) {
                  this.createLegendUrl({
                    type: 'icon',
                    data: {
                      icon,
                      title
                    }
                  })
                } else {
                  // case of double legend
                  this.setLayerCategoriesBySymbols(symbols);
                  this.createLegendUrl({
                    type: 'categories',
                    data: {
                      categories: this.layer.categories
                    }
                  })
                }
              }
            });
          } else if (layer.categories) layer.categories.forEach(category => category.disabled = category.checked);
        } catch(err){}
      },
      setLayerCategoriesBySymbols(symbols){
        /**
         * filter symbol without checked property (undefined)
         * it mean that is coming from a categories (for example charts associated)
         * that is not the categories legend associated to layer
         */
        symbols = symbols.filter(symbol => typeof symbol.checked !== "undefined").map(symbol => ({
          ...symbol,
          _checked: symbol.checked,
          disabled: false
        }));
        this.layer.categories = symbols.length ? symbols : null;
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
              /**
               * if exist categories on layer and return only one icon,
               * then need to return all categories
               */
              if (layer.categories) {
                responseObject.type = 'categories';
                responseObject.data = {
                  categories: layer.categories
                }
              } else {
                responseObject.type = 'icon';
                responseObject.data = {
                  icon,
                  title
                }
              }
            } else {
              if (layer.categories) {
                symbols.forEach(symbol =>{
                  const findSymbol = layer.categories.find(({icon, title}) => symbol.icon === icon && symbol.title === title);
                  if (!findSymbol) {
                    symbol._checked = symbol.checked;
                    symbol.disabled = false;
                    layer.categories.push(symbol);
                  }
                });
              } else this.setLayerCategoriesBySymbols(symbols);
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
      createLegendUrl({type, data={}}){
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
      },
      async getLegendSrc(layer) {
        try {
          const layerLegendCategories = await this.getSingleLayerLegendCategories(layer);
          const {type, data={}} = layerLegendCategories;
          this.createLegendUrl({
            type,
            data
          })
        } catch(err) {}
      }
    },
    created() {
      this.legendParams = ApplicationService.getConfig().layout ? ApplicationService.getConfig().layout.legend : {};
      this.mapReady = false;
      CatalogEventHub.$on('layer-change-style', this.handlerChangeLegend);
      this.getLegendSrc(this.layer);
    },
    async mounted() {
      await this.$nextTick();
      const mapService = GUI.getService('map');
      mapService.on('change-map-legend-params', async () => {
        this.mapReady = true;
        this.disableAddCategories(this.layer);
      });
    },
    beforeDestroy() {
      CatalogEventHub.$off('layer-change-style', this.handlerChangeLegend);
    }
  }
</script>

<style scoped>
  .layer-legend {
    padding-left: 38px;
  }
</style>