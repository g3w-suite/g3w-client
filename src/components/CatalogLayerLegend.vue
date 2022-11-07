<!-- ORIGINAL SOURCE: -->
<!-- app/gui/catalog/vue/components/layerlegend.vue@v3.4 -->

<template>
  <div v-show="show" class="layer-legend" @click.stop.prevent="">
    <bar-loader v-if="legend" :loading="legend.loading"></bar-loader>
    <figure>
      <div v-for="(legendurl, index) in legend.url"  style="display: flex; align-items: center; width: 100%" v-disabled="legendurl.disabled">
        <span v-if="legendurl.ruleKey" @click.stop.prevent="showHideLayerCategory(index)" style="padding-right: 3px;" :class="g3wtemplate.getFontClass(legendurl.checked ? 'check': 'uncheck')"></span>
        <img v-if ="legendplace === 'toc'" :src="legendurl.icon && `data:image/png;base64,${legendurl.icon}`" @error="setError()" @load="urlLoaded()">
        <span v-if="(legendplace === 'tab' && legendurl.ruleKey) || (legendplace === 'toc' && showCategoriesCheckBox)" class="new_line_too_long_text" style="padding-left: 3px;">{{legendurl.title}}</span>
      </div>
    </figure>
  </div>
</template>

<script>
  import CatalogEventHub from 'gui/catalog/vue/catalogeventhub';

  const ApplicationService = require('core/applicationservice');
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
        return this.legend.url.length > 1;
      }
    },
    methods: {
      getProjectLayer(){
        return CatalogLayersStoresRegistry.getLayerById(this.layer.id);
      },
      isDisabled(index){
        return this.legend.url[index].disabled;
      },
      showHideLayerCategory(index) {
        const projectLayer = this.getProjectLayer();
        const categories = projectLayer.getCategories();
        categories[index].checked = this.legend.url[index].checked = !this.legend.url[index].checked;
        projectLayer.change();
        if (this.legendplace === 'tab') CatalogEventHub.$emit('layer-change-categories', this.layer);
        else if (categories[index].checked && this.mapReady) this.disableAddCategories(this.layer);
      },
      setError() {
        this.legend.error = true;
        this.legend.loading = false;
      },
      async urlLoaded() {
        this.legend.loading = false;
      },
      async handlerChangeLegend(options={}){
        const { layerId } = options;
        if (layerId === this.layer.id) {
          await this.getLegendSrc(true);
          this.dynamic && this.disableAddCategories();
        }
      },
      async disableAddCategories(){
        try {
          const projectLayer = this.getProjectLayer();
          const legendurl = projectLayer.getLegendUrl(this.legendParams, {
            categories: true
          });
          const legendGraphics = await XHR.get({
            url: legendurl
          });
          const {nodes=[]} = legendGraphics;
          if (nodes.length) {
            nodes.forEach(({icon, title, symbols=[]}) => {
              const categories = projectLayer.getCategories();
              if (categories) {
                if (symbols.length < categories.length){
                  /**
                   * In case of only one symbol, getLegendGraphic return icon and title
                   */
                  if (icon && symbols.length === 0) symbols.push({
                    title,
                    icon
                  });
                  categories.forEach(category => {
                    if (typeof category.checked === "undefined" || category.checked) {
                      const findCategory = symbols.find(symbol => symbol.title === category.title && symbol.icon === category.icon);
                      category.disabled = !findCategory;
                    }
                  })
                  /*
                  * */
                } else categories.forEach(category => category.disabled = false);
              }
            });
          } else if (categories) categories.forEach(category => category.disabled = category.checked);
        } catch(err){}
      },
      setLayerCategoriesBySymbols(symbols){
        /**
         * filter symbol without checked property (undefined)
         * it mean that is coming from a categories (for example charts associated)
         * that is not the categories legend associated to layer
         */
        const categories = symbols.length ? symbols.map(symbol => ({
          ...symbol,
          _checked: symbol.checked,
          disabled: false
        })) : null;
        /**
         *
         * set categories extracted from symbols
         **/
        this.getProjectLayer().setCategories(categories);
      },
      async getSingleLayerLegendCategories(all=false) {
        const responseObject = {
          type: null,
          data: null
        };
        const projectLayer = this.getProjectLayer();

        try {
          const legendurl = projectLayer.getLegendUrl(this.legendParams, {
            categories: true,
            all // true meaning no bbox no filter just all referred to
          });
          const legendGraphics = await XHR.get({
            url: legendurl
          });
          const {nodes=[]} = legendGraphics;
          const categories = projectLayer.getCategories();
          nodes.forEach(({icon, title, symbols=[]}) => {
            if (icon) {
              /**
               * if exist categories on layer and return only one icon,
               * then need to return all categories
               */
              if (categories) {
                responseObject.type = 'categories';
                responseObject.data = {
                  categories
                }
              } else {
                responseObject.type = 'icon';
                responseObject.data = {
                  icon,
                  title
                }
              }
            } else {
              if (categories) {
                symbols.forEach(symbol =>{
                  const findSymbol = categories.find(({icon, title}) => symbol.icon === icon && symbol.title === title);
                  if (!findSymbol) {
                    symbol._checked = symbol.checked;
                    symbol.disabled = false;
                    categories.push(symbol);
                  }
                });
              } else this.setLayerCategoriesBySymbols(symbols);
              responseObject.type = 'categories';
              responseObject.data = {
                categories: projectLayer.getCategories()
              }
            }
          });
        } catch(err){
          responseObject.type = 'error';
          responseObject.data = err;
        }
        return responseObject;
      },
      getLegendUrl() {
        return this.getProjectLayer().getLegendUrl(this.legendParams);
      },
      createLegendUrl({type, data={}}){
        switch(type) {
          case 'icon':
            const {icon, title, disabled=false, checked=true} = data;
            this.legend.url = [{
              icon,
              title,
              disabled,
              checked
            }];
            break;
          case 'categories':
            const {categories} = data;
            this.legend.url = categories;
            break;
        }
        const projectLayer = this.getProjectLayer();
        const currentStyle = projectLayer.getCurrentStyle().name;
        if (typeof this.STYLES_GETLEGENDGRAPHIC_URLS[currentStyle] === "undefined")
          this.STYLES_GETLEGENDGRAPHIC_URLS[currentStyle] = this.legend.url;
      },
      async getLegendSrc(all=false) {
        try {
          const currentStyle = this.getProjectLayer().getCurrentStyle().name;
          if (all && this.STYLES_GETLEGENDGRAPHIC_URLS[currentStyle]) {
            this.legend.url = this.STYLES_GETLEGENDGRAPHIC_URLS[currentStyle]
          } else {
            const layerLegendCategories = await this.getSingleLayerLegendCategories(all);
            const {type, data={}} = layerLegendCategories;
            this.createLegendUrl({
              type,
              data
            })
          }
        } catch(err) {}
      }
    },
    watch: {
      'layer.visible'(visible){
        if (this.dynamic && visible) this.disableAddCategories();
      }
    },
    created() {
      /**
       * store legend url icons base on current style of layer
       * It use to cache all symbol of a style without get a new request to server
       * @type {{}}
       */
      this.STYLES_GETLEGENDGRAPHIC_URLS = {};
      this.dynamic = ProjectsRegistry.getCurrentProject().getContextBaseLegend();
      this.legendParams = ApplicationService.getConfig().layout ? ApplicationService.getConfig().layout.legend : {};
      this.mapReady = false;
      CatalogEventHub.$on('layer-change-style', this.handlerChangeLegend);
      /**
       * Get all legend graphics of a layer when start
       */
      this.getLegendSrc(true);
    },
    async mounted() {
      await this.$nextTick();
      const mapService = GUI.getService('map');
      this.dynamic && mapService.on('change-map-legend-params', async () => {
        this.mapReady = true;
        this.layer.visible && this.disableAddCategories();
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