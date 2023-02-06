<!--
  @file
  @since v3.7
-->

<template>

  <div
    v-show="show"
    class="layer-legend"
    @click.stop.prevent=""
  >

    <bar-loader
      v-if="legend"
      :loading="legend.loading"
    ></bar-loader>

    <figure v-if="externallegend">
      <img :src="getWmsSourceLayerLegendUrl()" >
    </figure>

    <figure v-else>
  
      <div v-for="(category, index) in categories"
        style="display: flex; align-items: center; width: 100%"
        v-disabled="category.disabled"
      >

        <span
          v-if="category.ruleKey"
          @click.stop.prevent="showHideLayerCategory(index)"
          style="padding-right: 3px;"
          :class="g3wtemplate.getFontClass(category.checked ? 'check': 'uncheck')"
        ></span>

        <img
          v-if ="('toc' === legendplace)"
          :src="category.icon && `data:image/png;base64,${category.icon}`"
          @error="setError()"
          @load="urlLoaded()"
        >

        <span
          v-if="('tab' === legendplace && category.ruleKey) || ('toc' === legendplace && showCategoriesCheckBox)"
          class="g3w-long-text"
          style="padding-left: 3px;"
        >
          {{category.title}}
        </span>

      </div>

    </figure>

  </div>

</template>

<script>
  import GUI from 'services/gui';
  import CatalogEventHub from 'gui/catalog/vue/catalogeventhub';
  import CatalogLayersStoresRegistry from 'store/catalog-layers';
  import ProjectsRegistry from 'store/projects';

  // const {XHR} = require('core/utils/utils');

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
    data() {
      return {
        categories: []
      }
    },
    computed:{
      externallegend() {
        return ('wms' === this.layer.source.type);
      },
      legend() {
        return this.layer.legend;
      },
      show() {
        return this.layer.expanded && this.layer.visible && ('toc' === this.legendplace || 'tab' === this.legendplace && this.layer.categories);
      },
      showCategoriesCheckBox() {
        return this.categories.length > 1;
      }
    },
    methods: {

      getWmsSourceLayerLegendUrl() {
        return this.getProjectLayer().getLegendUrl();
      },

      getProjectLayer() {
        return CatalogLayersStoresRegistry.getLayerById(this.layer.id);
      },

      isDisabled(index) {
        return this.categories[index].disabled;
      },

      showHideLayerCategory(index) {
        const projectLayer = this.getProjectLayer();
        this.categories[index].checked = !this.categories[index].checked;
        projectLayer.change();
        if ('tab' === this.legendplace) {
          this.layer.legend.change = true;
        } else if (this.categories[index].checked && this.mapReady) {
          this.setLayerCategories(false);
        }
      },

      setError() {
        this.legend.error = true;
        this.legend.loading = false;
      },

      async urlLoaded() {
        this.legend.loading = false;
      },

      async handlerChangeLegend(options={}) {
        if (this.externallegend) {
          return;
        }
        if (options.layerId === this.layer.id) {
          await this.setLayerCategories(true);
        }
        if (this.dynamic) {
          await this.setLayerCategories(false);
        }
      },

      async setLayerCategories(all=false) {
        try {

          const projectLayer = this.getProjectLayer();
          const categories = projectLayer.getCategories();

          if (all && categories) { // check if exist current layer categories
            this.categories = categories;
          } else {
            try {

              const { nodes = [] } = await projectLayer.getLegendGraphic({ all });

              // case of all categories
              if (all) {
                const categories = [];
                nodes.forEach(({ icon, title, symbols = []}) => {
                  if (icon) {
                    categories.push({ icon, title, disabled: false });
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
                      category.disabled = 
                        ("undefined" !== typeof category.checked ? category.checked : true) &&
                        false == symbols.find(symbol => symbol.icon === category.icon && symbol.title === category.title);
                    });
                  })
                } else {
                  categories.forEach(category => category.disabled = ("undefined" !== typeof category.checked ? category.checked : true));
                }

              }

            } catch(err) {
              this.setError();
            }
          }

        } catch(err) {
          this.setError();
        }

      }

    },
    watch: {

      /**
       * Only when visible show categories layer. In case of dynamic legend check
      */
      'layer.visible'(visible) {
        if (!this.externallegend && visible) {
          this.setLayerCategories(!this.dynamic);
        }
      }

    },

    async created() {

      /**
       * @FIXME the following comment seems wrong (isn't `this.dynamic` a `boolean` variable?)
       * 
       * Store legend url icons based on current style of layer
       * It use to cache all symbol of a style without get a new request to server
       * 
       * @type {{}}
       */
      this.dynamic = ProjectsRegistry.getCurrentProject().getContextBaseLegend();
      this.mapReady = false;

      CatalogEventHub.$on('layer-change-style', this.handlerChangeLegend);

      // Get all legend graphics of a layer when start
      if(this.layer.visible) {
        this.setLayerCategories(true).then(() => {
          if (this.dynamic) {
            GUI.getService('map').on('change-map-legend-params', async () => {
              this.mapReady = true;
              if (
                this.layer.visible &&
                (!this.externallegend && ('toc' === this.legendplace || this.layer.categories))
                ) {
                this.setLayerCategories(false);
              }
            });
          }
        })
      }

    },

    beforeDestroy() {
      CatalogEventHub.$off('layer-change-style', this.handlerChangeLegend);
    }

  }
</script>

<style scoped>
  .layer-legend {
    padding-left: 36px;
  }
</style>