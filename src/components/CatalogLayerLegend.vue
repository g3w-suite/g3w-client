<!-- ORIGINAL SOURCE: -->
<!-- app/gui/catalog/vue/components/layerlegend.vue@v3.4 -->

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
          {{category.title}}
        </span>

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
    data() {
      return {

        /**
         * Whether to show loading bar while changing style categories
         *
         * @since 3.8.0
         */
        loading: false,

        /**
         * Array of categories
         */
        categories: [],

        /**
         * Holds a reference to current layer style (active category)
         *
         * @since 3.8.0
         */
        currentstyle: this.layer.styles.find(style => true === style.current).name,

      }
    },
    computed: {
      /**
       * @returns {boolean} whether is a WMS layer
       */
      externallegend() {
        return ('wms' === this.layer.source.type);
      },

      /**
       * @returns {boolean} whether layer has legend to show
       */
      legend() {
        return this.layer.legend;
      },

      /**
       * @returns {boolean} whether if needed to show legend
       */
      show() {
        return this.layer.expanded &&
               this.layer.visible &&
               ('toc' === this.legendplace || 'tab' === this.legendplace && this.layer.categories);
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
        this.categories[index].checked = !this.categories[index].checked;
        this.getProjectLayer().change();
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
       * Method called when is changed style of a layer
       *
       * @since 3.8.0
       */
      async onChangeLayerLegendStyle(options={}) {
        this.loading = true;
        if (this.externallegend) {
          return;
        }
        // check if style is change on this layer
        if (options.layerId === this.layer.id) {
          try {
            // get all layer categories
            await this.setLayerCategories(true);
            // set current style
            this.currentstyle = options.style;
            // if filter layer legend by map content is set, enable/disable categories
            if (this.dynamic) {
              await this.setLayerCategories(false);
            }
          } catch(err) {
            console.warn('Error while changing layer style')
          }

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
              const findSymbol = symbols.find(symbol => symbol.icon === category.icon && symbol.title === category.title);
              const disabled = "undefined" !== typeof category.checked  ? category.checked : true;
              category.disabled = disabled && "undefined" === typeof findSymbol;
            });
          })
        } else {
          categories.forEach(category => category.disabled = ("undefined" !== typeof category.checked ? category.checked : true));
        }
      },
      /**
       * @since 3.8.0
       */
      registerChangeMapLegendParamsEvent(){
        GUI.getService('map')
          .on('change-map-legend-params', async () => {
            this.mapReady = true;
            if (
              this.layer.visible &&
              (false === this.externallegend && ('toc' === this.legendplace || this.layer.categories))
            ) {
              this.setLayerCategories(false);
            }
          });
      },
      /**
       * @since3.8.0
       * @returns {Promise<void>}
       */
      async runInitLayerVisibleAction(){
        await this.setLayerCategories(true);
        if (this.dynamic) {
          await this.setLayerCategories(false);
          this.registerChangeMapLegendParamsEvent();
        }
        this.initialize = true;
      }
    },
    watch: {

      /**
       * Only when visible show categories layer. In case of dynamic legend check
       * @param visible Boolean
      */
      async 'layer.visible'(visible) {
        // check if layer is enabled to get legend and if is visible
        if (false === this.externallegend && visible) {
          // check if the first time that is visible.
          // in this case need to be initialize
          if (false === this.initialize) {
            await this.runInitLayerVisibleAction();
          } else {
            //otherwise show categories base on if is dynamic legend or not
            await this.setLayerCategories(!this.dynamic);
          }
        }
      }

    },

    async created() {
      /**
       * It uses to check if check layer and its legend categories are initialized
       * register all events. It happened when the first time layer is visible
       * without do server request
       * @since 3.8.0
       * @type {boolean}
       */
      this.initialize = false;
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
      // listen layer change style event
      CatalogEventHub.$on('layer-change-style', this.onChangeLayerLegendStyle);

      // Get all legend graphics of a layer when start
      // need to exclude wms source
      if (false === this.externallegend && true === this.layer.visible) {
        await this.runInitLayerVisibleAction();
      }
    },

    beforeDestroy() {
      CatalogEventHub.$off('layer-change-style', this.onChangeLayerLegendStyle);
    },

  }
</script>

<style scoped>
  .layer-legend {
    padding-left: 36px;
  }
</style>