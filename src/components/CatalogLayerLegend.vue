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
    />

    <figure v-if="externallegend">
      <img :src="getWmsSourceLayerLegendUrl()" >
    </figure>

    <figure v-else v-disabled="loading">

      <bar-loader :loading="loading"/>

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
          v-if="('tab' === legendplace && category.ruleKey) || ('toc' === legendplace)"
          class="g3w-long-text"
          style="padding-left: 3px;"
        >
          <span>{{category.title}}</span>
          <span v-if="showfeaturecount && 'undefined' !== typeof category.ruleKey" style="font-weight: bold">
            [{{layer.stylesfeaturecount[currentstyle][category.ruleKey]}}]
          </span>
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
        /**
         * @since 3.8.0
         * */
        loading: false, // used to show bar loading when changind style categories
        categories: [], // Array contain categories
        /**
         * @sice 3.8.0
         * current layer style
         * */
        currentstyle: this.layer.styles.find(style => true === style.current).name
      }
    },
    computed: {

      /**
       * @returns {boolean} whether to display total number of features for current layer
       * 
       * @since 3.8.0 
       */
      showfeaturecount() {
       return "undefined" !== typeof this.layer.featurecount;
      },

      externallegend() {
        return ('wms' === this.layer.source.type);
      },
      /**
       * Boolean. Return true if layer has legend to show
       * */
      legend() {
        return this.layer.legend;
      },

      /**
       * Boolean. Return true if need to show legend
       * */
      show() {
        return this.layer.expanded && this.layer.visible && ('toc' === this.legendplace || 'tab' === this.legendplace && this.layer.categories);
      },

    },
    methods: {

      getWmsSourceLayerLegendUrl() {
        return this.getProjectLayer().getLegendUrl({
          width: 16,
          height: 16
        });
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

      /**
       * Method call when is changed style of a layer
       * */
      async handlerChangeStyleLayerLegend(options={}) {
        this.loading = true;
        const {layerId, style} = options;
        if (this.externallegend) {
          return;
        }
        if (layerId === this.layer.id) {
          try {
            await this.setLayerCategories(true);
            if ("undefined" !== typeof style) {
              await this.getProjectLayer().getStyleFeatureCount(style);
              this.currentstyle = style;
            }
          } catch(err) {}

        }
        if (this.dynamic) {
          await this.setLayerCategories(false);
        }
        this.loading = false;
      },

      async setLayerCategories(all=false) {
        try {
          const projectLayer = this.getProjectLayer();
          const categories = projectLayer.getCategories();

          if (all && categories) { // check if exist current layer categories
            this.categories = categories;
          } else {
            const { nodes = [] } = await projectLayer.getLegendGraphic({ all });
            if (all) { // case of all categories
              this._setAllLayerCategories(nodes);
            } else {
              this._updateLayerCategories(nodes, categories);
            }
          }
        } catch(err) {
          this.setError();
        }
      },

      /**
       * @since 3.8.0
       */
      _setAllLayerCategories(nodes) {
        const projectLayer = this.getProjectLayer();

        const categories = [];
        nodes.forEach(({ icon, title, ruleKey, checked, symbols = []}) => {
          if (icon) {
            /**
             * need to take care of checked and ruleKey
             * if just one category is set. If there are more that one category
             * symbols array is set
             */
            categories.push({ icon, title, ruleKey, checked, disabled: false });
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
      },

      /**
       * @since 3.8.0
       */
      _updateLayerCategories(nodes, categories) {
        const projectLayer = this.getProjectLayer();

        projectLayer.setCategories(categories);
        this.categories = categories;

        // case to update current categories
        if (nodes.length) {
          nodes.forEach(({icon, title, symbols = []}) => {
            if (icon) {
              symbols = [{icon, title}];
            }
            categories.forEach(category  => {
              const find = symbols.find(symbol => symbol.icon === category.icon && symbol.title === category.title);
              const disabled = "undefined" !== typeof category.checked  ? category.checked : true;
              category.disabled = disabled && !find;
            });
          })
        } else {
          categories.forEach(category => category.disabled = ("undefined" !== typeof category.checked ? category.checked : true));
        }
      },

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
      CatalogEventHub.$on('layer-change-style', this.handlerChangeStyleLayerLegend);

      // Get all legend graphics of a layer when start
      // need to exclude wms source
      if (this.layer.visible && this.layer.source && 'wms' !== this.layer.source.type) {
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
      CatalogEventHub.$off('layer-change-style', this.handlerChangeStyleLayerLegend);
    }

  }
</script>

<style scoped>
  .layer-legend {
    padding-left: 36px;
  }
</style>