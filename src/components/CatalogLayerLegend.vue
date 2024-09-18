<!--
  @file
  @since v3.7
-->

<template>

  <div
    v-if                = "show"
    class               = "layer-legend"
    @click.stop.prevent = ""
  >

    <bar-loader
      v-if     = "legend"
      :loading = "legend.loading"
    />

    <figure v-if = "externallegend">
      <img :src = "getWmsSourceLayerLegendUrl()" >
    </figure>

    <figure
      v-else
      v-disabled = "loading"
    >
      <bar-loader :loading = "loading"/>

      <div
        v-for                     = "(category, index) in categories"
        @contextmenu.prevent.stop = "showCategoryMenu"
        style                     = "display: flex; align-items: center; width: 100%"
        v-disabled                = "category.disabled"
      >

        <span
          v-if                = "category.ruleKey"
          @click.stop.prevent = "showHideLayerCategory(index)"
          style               = "padding-right: 3px;"
          :class              = "g3wtemplate.getFontClass(category.checked ? 'check': 'uncheck')"
        ></span>

        <img
          v-if   = "('toc' === legendplace)"
          :src   = "category.icon && `data:image/png;base64,${category.icon}`"
          @error = "setError()"
          @load  = "urlLoaded()"
        >

        <span
          v-if        = "('tab' === legendplace && category.ruleKey) || ('toc' === legendplace)"
          class       = "g3w-long-text"
          style       = "padding-left: 3px;"
          @click.stop = "onCategoryClick"
        >
          <span>{{category.title}}</span>
          <span
            v-if = "showfeaturecount && 'undefined' !== typeof category.ruleKey"
            style = "font-weight: bold"
          >
            [{{layer.stylesfeaturecount[currentstyle][category.ruleKey]}}]
          </span>
        </span>

      </div>

    </figure>

  </div>

</template>

<script>
  import GUI                         from 'services/gui';
  import { VM }                      from 'g3w-eventbus';
  import ApplicationState            from 'store/application';
  import ClickMixin                  from 'mixins/click';
  import { getCatalogLayerById }     from 'utils/getCatalogLayerById';


  export default {
    name: "catalog-layer-legend",
    props: {
      legendplace: {
        type: String
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
    mixins: [ClickMixin],
    computed: {

      /**
       * @returns {boolean} whether to display total number of features for current layer
       *
       * @since 3.8.0
       */
      showfeaturecount() {
        return undefined !== this.layer.featurecount;
      },

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
        return (
          this.layer.expanded &&
          this.layer.visible &&
          ('toc' === this.legendplace || 'tab' === this.legendplace && this.layer.categories)
        );
      },

    },

    methods: {

      /**
       * @since v3.8
       */
      onCategoryClick() {
        this.handleClick({
          '1': () => { /** @TODO this.selectCategory() */ console.info('TODO: select category (single click)'); },
          '2': () => { /** @TODO this.zoomToCategory() */ console.info('TODO: zoom to category (double click)'); }
        }, this);
      },

      /**
       * Show category contextual menu
       * 
       * @fires showmenucategory
       * 
       * @since v3.8
       */
      showCategoryMenu() {
        this.$emit('showmenucategory');
      },
  
      getWmsSourceLayerLegendUrl() {
        return this.getProjectLayer().getLegendUrl({
          width:  16,
          height: 16
        });
      },

      getProjectLayer() {
        return getCatalogLayerById(this.layer.id);
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
        this.legend.error   = true;
        this.legend.loading = false;
      },

      async urlLoaded() {
        this.legend.loading = false;
      },

      /**
       * Handle changing style of layer legend
       *
       * @since 3.8.0
       */
      async onChangeLayerLegendStyle(options={}) {
        this.loading = true;

        if (this.externallegend) {
          return;
        }

        try {
          // check if style is passed on options and if the style is changed on this layer
          if (undefined !== options.style && options.layerId === this.layer.id) {
            await this.setLayerCategories(true);                              // Get all layer categories.
            await this.getProjectLayer().getStyleFeatureCount(options.style); // Get style feature count.
            this.currentstyle = options.style;                                // Set current style.
            if (this.dynamic) {                                               // If filter layer legend by map content is set,
              await this.setLayerCategories(false);                           // toggle categories.
            }
          }
        } catch(e) {
          console.warn('Error while changing layer style', e)
        }

        this.loading = false;
      },

      async setLayerCategories(all=false) {
        try {
          const projectLayer = this.getProjectLayer();
          const categories   = projectLayer.getCategories();

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
            // just one category is set (take care of `checked` and `ruleKey`).
            categories.push({ icon, title, ruleKey, checked, disabled: false });
          } else {
            // there are more that one category (`symbols` array is set).
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
              const disabled = undefined !== category.checked  ? category.checked : true;
              category.disabled = disabled && undefined === findSymbol;
            });
          })
        } else {
          categories.forEach(category => category.disabled = (undefined !== category.checked ? category.checked : true));
        }
      },

      /**
       * @since 3.8.0
       */
      async onChangeMapLegendParams() {
        this.mapReady = true;
        if (
          this.layer.visible &&
          false === this.externallegend &&
          ('toc' === this.legendplace || this.layer.categories)
        ) {
          this.setLayerCategories(false);
        }
      },

      /**
       * @returns {Promise<void>}
       *
       * @listens map~change-map-legend-params
       *
       * @since 3.8.0
       */
      async runInitLayerVisibleAction() {
        await this.setLayerCategories(true);
        if (this.dynamic) {
          await this.setLayerCategories(false);
          GUI.getService('map').on('change-map-legend-params', this.onChangeMapLegendParams);
        }
        this.initialize = true;
      },

    },

    watch: {

      /**
       * Only when visible show categories layer. In case of dynamic legend check
       *
       * @param {boolean} visible
       */
      async 'layer.visible'(visible) {
        // check if layer is enabled to get legend and if is visible
        const enabled = visible && false === this.externallegend;
        // initialize if it is the first time that is visible.
        if (enabled && false === this.initialize) {
          await this.runInitLayerVisibleAction();
        }
        // otherwise show categories base on if is dynamic legend or not
        if (enabled && false !== this.initialize) {
          await this.setLayerCategories(!this.dynamic);
        }
      }

    },

    async created() {

      /**
       * Used to check if layer and its legend categories are initialized
       * That means register all events at first time the layer is visible
       * without do any server request
       *
       * @type {boolean}
       *
       * @since 3.8.0
       */
      this.initialize = false;

      /**
       * @FIXME the following comment seems wrong (isn't `this.dynamic` a `boolean` variable?)
       *
       * Store legend url icons based on the current style of layer.
       * It uses to cache all symbols of a style without get a new request to server
       *
       * @type {{}}
       */
      this.dynamic = ApplicationState.project.state.context_base_legend;

      this.mapReady = false;

      // listen to layer change style event
      VM.$on('layer-change-style', this.onChangeLayerLegendStyle);

      // Get all legend graphics of a layer when start
      // need to exclude wms source
      if (false === this.externallegend && true === this.layer.visible) {
        await this.runInitLayerVisibleAction();
      }

    },

    beforeDestroy() {
      VM.$off('layer-change-style', this.onChangeLayerLegendStyle);
    },

  }
</script>

<style scoped>
  .layer-legend {
    padding-left: 36px;
  }
</style>