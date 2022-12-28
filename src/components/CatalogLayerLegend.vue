<!-- ORIGINAL SOURCE: -->
<!-- app/gui/catalog/vue/components/layerlegend.vue@v3.4 -->

<template>
  <div v-show="show" class="layer-legend" @click.stop.prevent="">
    <bar-loader v-if="legend" :loading="legend.loading"></bar-loader>
    <figure v-if="externallegend">
      <img :src="getWmsSourceLayerLegendUrl()" >
    </figure>
    <figure v-else>
      <div v-for="(category, index) in categories"  style="display: flex; align-items: center; width: 100%" v-disabled="category.disabled">
        <span v-if="category.ruleKey" @click.stop.prevent="showHideLayerCategory(index)" style="padding-right: 3px;" :class="g3wtemplate.getFontClass(category.checked ? 'check': 'uncheck')"></span>
        <img v-if ="legendplace === 'toc'" :src="category.icon && `data:image/png;base64,${category.icon}`" @error="setError()" @load="urlLoaded()">
        <span v-if="(legendplace === 'tab' && category.ruleKey) || (legendplace === 'toc' && showCategoriesCheckBox)" class="g3w-long-text" style="padding-left: 3px;">{{category.title}}</span>
      </div>
    </figure>
  </div>
</template>

<script>
  import CatalogEventHub from 'gui/catalog/vue/catalogeventhub';

  const ProjectsRegistry = require('core/project/projectsregistry');
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
      return {
        categories: []
      }
    },
    computed:{
      externallegend(){
        return this.layer.source.type === 'wms';
      },
      legend(){
        return this.layer.legend;
      },
      show(){
        return this.layer.visible && this.legend.show && (this.legendplace === 'toc' || this.legendplace === 'tab' && this.layer.categories);
      },
      showCategoriesCheckBox(){
        return this.categories.length > 1;
      }
    },
    methods: {
      getWmsSourceLayerLegendUrl() {
        return this.getProjectLayer().getLegendUrl();
      },
      getProjectLayer(){
        return CatalogLayersStoresRegistry.getLayerById(this.layer.id);
      },
      isDisabled(index){
        return this.categories[index].disabled;
      },
      showHideLayerCategory(index) {
        const projectLayer = this.getProjectLayer();
        this.categories[index].checked = this.categories[index].checked = !this.categories[index].checked;
        projectLayer.change();
        if (this.legendplace === 'tab') CatalogEventHub.$emit('layer-change-categories', this.layer);
        else if (this.categories[index].checked && this.mapReady) this.setLayerCategories(false);
      },
      setError() {
        this.legend.error = true;
        this.legend.loading = false;
      },
      async urlLoaded() {
        this.legend.loading = false;
      },
      async handlerChangeLegend(options={}){
        if (this.externallegend) return;
        const { layerId } = options;
        layerId === this.layer.id && await this.setLayerCategories(true);
        this.dynamic && await this.setLayerCategories(false);
      },
      async setLayerCategories(all=false) {
        try {
          const projectLayer = this.getProjectLayer();
          // get current categories from layer and check if exist
          const categories = projectLayer.getCategories();
          if (all && categories) this.categories = categories;
          else {
            try {
              const legendGraphics = await projectLayer.getLegendGraphic({
                all
              });
              const {nodes = []} = legendGraphics;
              // case of all categories
              if (all) {
                const categories = [];
                nodes.forEach(({icon, title, symbols = []}) => {
                  if (icon) {
                    categories.push({
                      icon,
                      title,
                      disabled: false
                    })
                  } else {
                    symbols.forEach(symbol => {
                      symbol._checked = symbol.checked;
                      symbol.disabled = false;
                      categories.push(symbol);
                    });
                  }
                });
                projectLayer.setCategories(categories);
                this.categories = categories;
              } else {
                projectLayer.setCategories(categories);
                this.categories = categories;
                // case to update current categories
                if (nodes.length) {
                  nodes.forEach(({icon, title, symbols = []}) => {
                    if (icon) symbols = [{icon, title}];
                    categories.forEach(category  => {
                      const find = symbols.find(symbol => symbol.icon === category.icon && symbol.title === category.title);
                      const disabled = typeof category.checked !== "undefined" ? category.checked : true;
                      category.disabled = disabled && !find;
                    });
                  })
                } else categories.forEach(category => category.disabled = typeof category.checked !== "undefined" ? category.checked : true);
              }
            } catch(err) {this.setError();}
          }
        } catch(err) {this.setError();}
      }
    },
    watch: {
      'layer.visible'(visible){
        /*
        * Only when visible show categories layer. In case of dynamic legend check
        * **/
       !this.externallegend && visible && this.setLayerCategories(!this.dynamic);
      }
    },
    async created() {
      /**
       * store legend url icons base on current style of layer
       * It use to cache all symbol of a style without get a new request to server
       * @type {{}}
       */
      this.dynamic = ProjectsRegistry.getCurrentProject().getContextBaseLegend();
      this.mapReady = false;
      CatalogEventHub.$on('layer-change-style', this.handlerChangeLegend);
      /**
       * Get all legend graphics of a layer when start
       */
      this.layer.visible && this.setLayerCategories(true).then(()=>{
        const mapService = GUI.getService('map');
        this.dynamic && mapService.on('change-map-legend-params', async () => {
          this.mapReady = true;
          this.layer.visible &&
          (!this.externallegend && (this.legendplace === 'toc' || this.layer.categories)) && this.setLayerCategories(false);
        });
      })
    },
    async mounted() {
      await this.$nextTick();
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