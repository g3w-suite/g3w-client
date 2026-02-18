<!--
  @file
  @since v3.7
-->

<template>

  <li
    v-if                      = "layerstree.toc"
    class                     = "tree-item"
    @contextmenu.prevent.stop = "showContextMenu"
    @click.stop               = "onTreeItemClick"
    :style                    = "{
      marginLeft: !isGroup ? '5px' : '0',
      position: 'relative',
    }"
    :class                    = "{
      selected: layerstree.selected,
      disabled: isDisabled,
      group:    isGroup,
      table:    isTable,
    }"
  >
    <!-- GROUP LAYER -->
    <span
      v-if        = "isGroup"
      style       = "padding-right: 2px;"
      :class      = "['root tree-toggler', $fa(layerstree.expanded ? 'caret-down' : 'caret-right')]"
      @click.stop = "expandCollapse"
    ></span>

    <!-- GROUP LAYER -->
    <input
      v-if        = "isGroup"
      type        = "checkbox"
      @click.stop = "toggle()"
      v-model     = "layerstree.checked"
    />

    <!-- TABLE LAYER -->
    <span
      v-if   = "isTable"
      v-show = "!layerstree.hidden"
      style  = "padding-left: 18px"
      :class = "['fas fa-table', parentFolder ? 'child' : 'root']"
    ></span>

    <!-- EXTERNAL LAYER (REMOVABLE NODE) -->
    <span 
      v-if        = "!isTable && !isGroup && layerstree.external && layerstree.removable"
      style       = "color: red; padding-left: 1px;"
      class       = "fas fa-trash"
      @click.stop = "removeExternalLayer(layerstree.name, layerstree._type)"
    ></span>

    <!-- HIDDEN NODE (LAYER) -->
    <span
      v-if   = "!isTable && !isGroup"
      v-show = "!layerstree.hidden"
      class  = "checkbox-layer"
      :class = "parentFolder ? 'child' : 'root'"
    >
      <span
        v-if             = "!isTable && !isGroup && ('toc' === legendlayerposition || !isGroup && layerstree.categories)"
        @click.self.stop = "expandCollapse"
        class            = "tree-toggler"
        :class           = "$fa(layerstree.visible && layerstree.expanded ? 'caret-down' : 'caret-right')"
      ></span>

      <input
        type        = "checkbox"
        @click.stop = "toggle()"
        v-model     = "layerstree.checked"
        :style      = "{
          marginLeft: ('toc' === legendlayerposition)
            ? '5px'
            : !isGroup && layerstree.categories
              ? '5px'
              : (!layerstree.legend && layerstree.external)
                ? '1px'
                : '18px'
        }"
        :class      = "[{ 'toc-added-external-layer': (!layerstree.legend && layerstree.external) }]"
      />

    </span>

    <!-- EXTERNAL LAYER  -->
    <span
      v-if   = "!isTable && !isGroup && layerstree.external && !layerstree.toc"
      style  = "color: #ffff; padding-left: 5px;"
      :class = "$fa('vector' === layerstree._type ? 'draw' : 'image')"
    ></span>

    <!-- VISIBLE NODE (LAYER or GROUP) -->
    <div
      v-show = "!layerstree.hidden || isGroup"
      class  = "tree-node-title"
      :class = "{
        disabled: !layerstree.external && (layerstree.disabled || (layerstree.id && !layerstree.visible)),
        bold: isGroup
      }"
    >

      <span
        :class           = "{
          highlightlayer:  isHighLight,
          scalevisibility: showscalevisibilityclass,
        }"
        class                = "g3w-long-text"
        :data-i18n-title     = "showScaleVisibilityToolip ? `minscale:${layerstree.minscale} - maxscale:${layerstree.maxscale}` : ''"
        data-placement       = "top"
        data-i18n-raw        = ""
      >
        <!-- REMOVE CURRENT FILTER  -->
        <button
          v-if             = "!isGroup && !layerstree.external && null !== layerstree.filter.current"
          type             = "button"
          :data-i18n-title = "layerstree.filter.current.name"
          data-placement   = "top"
          data-i18n-raw    = ""
          class            = "action-button"
          style            = "box-shadow: unset;"
          @click.stop      = "removeCurrentFilter"
        >
          <i aria-hidden = "true" class = "fas fa-filter" style = "color: red"></i>
        </button>
        <!-- VISIBLE NODE TITLE (LAYER or GROUP) -->
        <span>{{ layerstree.title }}</span>
        <!-- LAYER FEATURES COUNT-->
        <b v-if = "!isGroup && showfeaturecount"> [{{ getFeatureCount }}] </b>
      </span>

      <!-- VISIBLE NODE SELECTED (LAYER) -->
      <div v-if = "(!isGroup && layerstree.selection)">

        <!-- CLEAR SELECTION -->
        <button
          v-if           = "layerstree.selection.active"
          type           = "button"
          class          = "action-button"
          title          = "Clear Selection"
          data-placement = "left"
          @click.stop    = "clearSelection"
        >
          <i aria-hidden = "true" class = "fas fa-broom"></i>
        </button>

        <!-- TOGGLE FILTER  -->
        <button
          v-if           = "!layerstree.external && (layerstree.selection.active || layerstree.filter.active) && !layerstree.filter.pagination"
          type           = "button"
          class          = "action-button"
          title          = "Enable/Disable filter"
          data-placement = "left"
          :class         = "layerstree.filter.active ? 'active' : ''"
          @click.stop    = "toggleFilterLayer"
        >
          <i aria-hidden = "true" class = "fas fa-filter"></i>
        </button>

        <!-- SAVE FILTER  -->
        <button
          v-if           = "logged && !layerstree.external && (layerstree.selection.active && layerstree.filter.active)"
          type           = "button"
          class          = "action-button"
          title          = "Save Filter"
          data-placement = "left"
          @click.stop    = "saveFilter(layerstree)"
        >
          <i aria-hidden = "true" class = "far fa-save"></i>
        </button>

      </div>

    </div>

    <!-- NODE LEGEND (LAYER) -->
    <figure
      v-if                = "has_legend"
      v-show              = "show_legend"
      class               = "layer-legend"
      v-disabled          = "!is_external_wms && loading_legend"
      @click.stop.prevent = ""
    >
      <div  v-show = "loading_legend || legend_tree.loading" class = "bar-loader"></div>
      <img
        v-if       = "is_external_wms" 
        loading    = "lazy"
        :src       = "legend_tree.url" 
        @loaderror = "setError()"
        @load      = "urlLoaded()"
      >
      <template v-else>
        <div
          v-for                     = "(category, index) in legend_categories"
          @contextmenu.prevent.stop = "showCategoryMenu"
          style                     = "display: flex; align-items: center; width: 100%"
          v-disabled                = "category.disabled"
        >

          <input
            v-if        = "category.ruleKey"
            type        = "checkbox"
            @click.stop = "toggleCategory(index)"
            style       = "margin-right: 3px;"
            v-model     = "category.checked"
          />

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
            <b v-if = "showfeaturecount && undefined !== category.ruleKey"> [{{layerstree.featurecount[category.ruleKey]}}] </b>
          </span>

        </div>

      </template>
    </figure>

    <!-- CHILD NODES (GROUP) -->
    <ul
      v-if   = "isGroup"
      class  = "group"
      v-show = "layerstree.expanded"
    >
      <catalog-tree
        v-for                      = "_layerstree in layerstree.nodes" :key = "_layerstree.id || _layerstree.groupId"
        :root                      = "false"
        :legendConfig              = "legend"
        :legendplace               = "legendplace"
        :parentFolder              = "isGroup"
        :layerstree                = "_layerstree"
        :storeid                   = "storeid"
        :parent                    = "layerstree"
        :parent_mutually_exclusive = "!!layerstree.mutually_exclusive"
      />
    </ul>

    <button
      v-if           = "layerstree.root"
      type           = "button"
      data-placement = "left"
      title          = "legend"
      @click.stop    = "showLegendPanel"
      style          = "position: absolute;inset: 0 4px auto auto;border-radius: 3px;"
    >
      <i aria-hidden = "true" class = "fas fa-list"></i>
    </button>

    <button
      v-if           = "!isGroup"
      type           = "button"
      class          = "toggle-context-menu"
      data-placement = "left"
      title         = "Open menu"
      @click.stop    = "showContextMenu"
    >
      <i aria-hidden = "true" class = "fas fa-ellipsis-v"></i>
    </button>

  </li>

</template>

<script>
import ApplicationState        from 'g3w-state';
import GUI                     from 'g3w-app';
import { getCatalogLayerById } from 'utils/getCatalogLayerById';
import { XHR }                 from 'utils/XHR';

function _setAllLayersVisible(layers) {
  layers.nodes.forEach(n => {
    if (undefined === n.id) {
      _setAllLayersVisible({ nodes: n.nodes, visible: layers.visible && n.checked });
    } else if (n.parentGroup.checked && n.checked) {
      getCatalogLayerById(n.id).setVisible(layers.visible);
    }
  });
};

export default {

  /** @since 3.8.6 */
  name: 'catalog-tree',

  props : [
    'layerstree',
    'storeid',
    'legend',
    'legendplace',
    'parent_mutually_exclusive',
    'parentFolder',
    'externallayers',
    'root',
    'parent'
  ],

  data() {
    return {
      expanded:          this.layerstree.expanded,
      logged:            undefined !== ApplicationState.user.id, //@since 3.10.0
      /** @since 3.8.0 - Whether to show loading bar while changing style categories */
      loading_legend:    false,
      /** Array of categories */
      legend_categories: [],
      /** @since 3.8.0 - Holds a reference to current layer style (active category) */
      currentstyle:      null,
    }
  },

  computed: {

    /**
     * @returns {boolean} whether to display total number of features for current layer
     *
     * @since 3.8.0
     */
    showfeaturecount() {
      return undefined !== this.layerstree.featurecount;
    },

    has_legend() {
      return !this.isGroup && !this.layerstree.exclude_from_legend && this.layerstree.geolayer;
    },

    isGroup() {
      return !!this.layerstree.nodes;
    },

    isTable() {
      return !this.isGroup && !this.layerstree.geolayer && !this.layerstree.external;
    },

    legendlayerposition() {
      return (!this.layerstree.exclude_from_legend && this.layerstree.legend) ? this.legendplace : 'tab';
    },

    showscalevisibilityclass() {
      return !this.isGroup && this.layerstree.scalebasedvisibility;
    },

    showScaleVisibilityToolip() {
      return this.showscalevisibilityclass && this.layerstree.disabled && this.layerstree.checked;
    },

    isHidden() {
      return true === this.layerstree?.hidden;
    },

    selected() {
      this.layerstree.selected = (this.layerstree.disabled && this.layerstree.selected) ? false : this.layerstree.selected;
    },

    isHighLight() {
      const layer = getCatalogLayerById(this.layerstree.id) || this.layerstree;
      return !this.isGroup && ApplicationState.highlightlayers && layer && layer.isVisible() && layer.getTocHighlightable();
    },

    isDisabled() {
      return (!this.isGroup && !this.isTable && !this.layerstree.external && (!this.layerstree.visible || this.layerstree.disabled));
    },

    /**
     * @since 3.8.0
     */
    getFeatureCount() {
      return Object.values(this.layerstree.featurecount).reduce((total, categoryFeatureCount) => total + 1 * categoryFeatureCount, 0);
    },

    /**
     * @returns {boolean} whether is a WMS layer
     * 
     * @since 4.1.0
     */
    is_external_wms() {
      return 'wms' === this.layerstree.source.type;
    },

    /**
     * @returns {boolean} whether layer has legend to show
     * 
     * @since 4.1.0
     */
    legend_tree() {
      return this.layerstree.legend || {};
    },

    /**
     * @returns {boolean} whether to show legend
     * 
     * @since 4.1.0
     */
    show_legend() {
      return (
        this.layerstree.expanded 
        && this.layerstree.visible 
        && ('toc' === this.legendplace || 'tab' === this.legendplace && this.layerstree.categories)
      );
    },

  },

  watch: {

    'layerstree.checked'() {
      if (this.isGroup) {
        this.handleGroupChecked(this.layerstree);
      } else {
        this.handleLayerChecked(this.layerstree);
      }
    },

    /**
     * @since 4.1.0
     */
    has_legend: {
      immediate: true,
      async handler(show) {
        if (show) {
          this.loading_legend    = false;
          this.legend_categories = [];
          this.currentstyle      = this.layerstree.styles.find(s => true === s.current)?.name;

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
          this.dynamic  = ApplicationState.project.state.context_base_legend;

          this.mapReady = false;

          // listen to layer change style event
          getCatalogLayerById(this.layerstree.id).onafter('change', this.onLayerChange);

          // Get all legend graphics of a layer when start
          // need to exclude wms source
          if (!this.is_external_wms && true === this.layerstree.visible) {
            await this.runInitLayerVisibleAction();
          }

          if (this.layerstree.visible && this.is_external_wms) {
            await this.setWmsSourceLayerLegendUrl();
          }
        } else {
          //remove change event on legend
          getCatalogLayerById(this.layerstree.id)?.un('change', this.onLayerChange);
        }
      }
    },

    /**
     * Only when visible show categories layer. In case of dynamic legend check
     *
     * @param {boolean} visible
     * 
     * @since 4.1.0
     */
    async 'layerstree.visible'(visible) {
      if (!this.has_legend) {
        return;
      }
      // check if layer is enabled to get legend and if is visible
      const enabled = visible && !this.is_external_wms;
      // initialize if it is the first time that is visible.
      if (enabled && false === this.initialize) {
        await this.runInitLayerVisibleAction();
      }
      // otherwise show categories base on if is dynamic legend or not
      if (enabled && false !== this.initialize) {
        await this.setCategories(!this.dynamic);
      }
      if (visible && this.is_external_wms) {
        await this.setWmsSourceLayerLegendUrl();
      }
    },

  },

  methods: {

    /**
     * Remove current active filter
     *
     * @since 3.9.0
     */
    removeCurrentFilter() {
      return getCatalogLayerById(this.layerstree.id).deleteToken();
    },

    /**
     * Handle change checked property of group
     *
     * @param {boolean} group.checked
     * @param {uknown}  group.parentGroup
     * @param {uknown}  group.nodes
     */
    handleGroupChecked(group) {

      if (!group.checked) {
        group.nodes.forEach(n => {
          if (undefined === n.id) {
            _setAllLayersVisible({ nodes: n.nodes, visible: false });
          } else if (n.checked) {
            getCatalogLayerById(n.id).setVisible(false);
          }
        });
        return; // NB exit early!
      }

      const visible            = group?.parentGroup?.checked ?? true;
      const mutually_exclusive = group?.parentGroup?.mutually_exclusive;

      if (!mutually_exclusive) {
        _setAllLayersVisible({ nodes: group.nodes, visible });
      }

      if (mutually_exclusive) {
        group.parentGroup.nodes.forEach(n => {
          n.checked = n.groupId === group.groupId;
          if (n.checked) {
            _setAllLayersVisible({ nodes: n.nodes, visible });
          }
        });
      }

      // traverse parent groups
      let g = group.parentGroup;
      while (g) {
        g.checked = g.root || g.checked;
        g         = g.parentGroup;
      }
    },

    /**
     * Handle changing checked property of layer
     *
     * @param {boolean} layer.checked
     * @param {string}  layer.id
     * @param {boolean} layer.disabled
     * @param {boolean} layer.projectLayer
     * @param {uknown}  layer.parentGroup
     * 
     * @fires GUI~treenodevisible since 4.1.0
     */
    handleLayerChecked(layer) {

      // external layer (eg. temporary layer through `addlayerscontrol`)
      if (!layer.projectLayer) {
        layer.visible = layer.checked;
        layer.setVisible(layer.checked);
        GUI.emit('change-layer-visibility', { id: layer.id, visible: layer.checked, type: layer._type });
        return;  // NB exit early!
      }

      // project layer (eg. qgis layer)
      const qlayer  = getCatalogLayerById(layer.id);
      const checked = layer.checked;

      qlayer.setVisible(checked ? !layer.disabled : false)

      if (checked && layer.parentGroup?.mutually_exclusive) {
        layer.parentGroup.nodes.forEach(n => n.checked = n.id === layer.id);
      }

      // traverse parent groups
      let g = layer.parentGroup;
      while (checked && g) {
        g.checked = true;
        g         = g.parentGroup;
      }

      GUI.emit('treenodevisible', qlayer);
    },

    /**
     * Save layer filter
     *
     * @since 3.9.0
     */
    saveFilter(layerstree) {
      getCatalogLayerById(layerstree.id).saveFilter();
    },

    /**
     * @fires GUI~activefiltertokenlayer since 4.1.0
     */
    toggleFilterLayer() {
      GUI.emit('activefiltertokenlayer', this.storeid, this.layerstree);
    },

    /**
     * @fires GUI~unselectionlayer since 4.1.0
     */
    clearSelection() {
      GUI.emit('unselectionlayer', this.storeid, this.layerstree);
    },

    toggle() {
      this.layerstree.checked = !this.layerstree.checked;
      //@since 4.1.0 Emite layer checked event
      this.$emit('layerchecked', this.layerstree);
    },

    expandCollapse() {
      this.layerstree.expanded = !this.layerstree.expanded;
    },

    /**
     * Select legend item
     *
     * @fires GUI~treenodeselected since 4.1.0
     */
    select() {
      // `undefined === selected` means unselectable layer (eg. external/temporary  WMS)
      if (
        undefined !== this.layerstree.selected 
        && ((!this.isGroup && !this.isTable) || (this.layerstree.external && false === this.layerstree.projectLayer))
      ) {
        GUI.emit('treenodeselected', this.layerstree);
      }
    },

    /**
     * @TODO refactor this, almost the Same as `ContextMenu.vue::zoomToLayer(layer)`
     *
     * @since 3.10.0
     */
    maybeZoomToLayer(layer) {
      if (this.canZoom(this.layerstree)) {
        let bbox = [layer.bbox.minx, layer.bbox.miny, layer.bbox.maxx, layer.bbox.maxy];
        let epsg = layer.epsg || GUI.getEpsg();
        bbox = epsg === GUI.getEpsg() ? bbox : ol.proj.transformExtent(bbox, epsg, GUI.getEpsg());
        const geometry = ol.extent.containsExtent(ApplicationState.project.state.extent, bbox) ? bbox : ApplicationState.project.state.extent;
        const view     = GUI.getMap().getView();
        view.animate(
          { duration: 200, center:     view.getCenter() },
          { duration: 200, resolution: view.getResolution() }
        );
        view.fit(geometry, { constrainResolution: true, size: GUI.getMap().getSize() });
      }
    },

    /**
     * @TODO refactor this, almost the same as: `ContextMenu.vue::canZoom(layer))`
     *
     * @since v3.8
     */
    canZoom(layer) {
      return (layer.bbox && [layer.bbox.minx, layer.bbox.miny, layer.bbox.maxx, layer.bbox.maxy].find(c => c > 0));
    },

    /**
     * Handle `click` and `doubleclick` click events on a single tree item (TOC).
     *
     * 1 = select legend item
     * 2 = zoom to layer bounds
     *
     * @since v3.8
     */
    onTreeItemClick() {
      this.handleClick({
        '1': () => !this.isTable && !this.isGroup && this.select(),
        '2': () => !this.isTable && this.maybeZoomToLayer(this.layerstree)
      }, this);
    },

    removeExternalLayer(name) {
      GUI.removeExternalLayer(name);
    },

    /**
     * @param evt
     * 
     * @fires GUI~context-menu since 4.1.0
     * 
     * @since 3.10.0
     */
    showContextMenu(evt) {
      GUI.emit('context-menu', evt, this.layerstree);
    },

    /**
     * @since 4.1.0
     */
    showLegendPanel() {
      GUI.showLegendPanel();
    },

    /**
     * @since 4.1.0
     */
    onCategoryClick() {
      console.log('TODO: handle click on category');
    },

    /**
     * Show category contextual menu
     * 
     * @fires showmenucategory
     * 
     * @since 4.1.0
     */
    showCategoryMenu() {
      this.$emit('showmenucategory');
    },

    /**
     * set external legend url
     * 
     * @since 4.1.0
     */
    async setWmsSourceLayerLegendUrl() {
      if (!this.legend_tree.url) {
        this.legend_tree.loading = true;
        await this.$nextTick();
        this.legend_tree.url = getCatalogLayerById(this.layerstree.id).getLegendUrl({
          ...window.initConfig?.layout?.legend,
          width:  16,
          height: 16,
        });
      }
    },

    /**
     * @since 4.1.0
     */
    toggleCategory(index) {
      this.legend_categories[index].checked = !this.legend_categories[index].checked;
      //emit chang layer on map to refresh tiles
      getCatalogLayerById(this.layerstree.id).change();
      
      if ('tab' === this.legendplace) {
        this.layerstree.legend.change = true;
      } else if (this.legend_categories[index].checked && this.mapReady) {
        this.setCategories(false);
      }

    },

    /**
     * @since 4.1.0
     */
    setError() {
      this.legend_tree.error   = true;
      this.legend_tree.loading = false;
    },

    /**
     * @since 4.1.0
     */
    async urlLoaded() {
      this.legend_tree.loading = false;
    },

    /**
     * Handle changing style of layer legend
     *
     * @since 4.1.0
     */
    async onLayerChange(opts = {}) {
      if (this.is_external_wms) {
        return;
      }

      this.loading_legend = true;

      try {
        await this.setCategories(true);
        this.currentstyle = opts.style;                                // Set current style.
        if (this.dynamic) {    
          await this.setCategories(false);                           // toggle categories.
        }
      } catch(e) {
        console.warn('Error while changing layer style', e)
      }

      this.loading_legend = false;
    },

    /**
     * @param { boolean } all true = no bbox no filter (just all referred to)
     * 
     * @since 4.1.0
     */
    async setCategories(all = false) {
      try {
        const projectLayer = getCatalogLayerById(this.layerstree.id);
        const categories   = projectLayer.getCategories();

        if (all && categories) { // check if exist current layer categories
          this.legend_categories = categories;
        } else {
          const { nodes = [] } = await XHR.get({
            url: projectLayer.getLegendUrl(
              window.initConfig?.layout?.legend,
              {
                categories: true,
                format:     'application/json', // request format (icon and label of each category)
                all,
              }
            )
          });
          if (all) { // case of all categories
            const projectLayer = getCatalogLayerById(this.layerstree.id);
            const categories = [];
            nodes.forEach(({ icon, title, ruleKey, checked, symbols = [] }) => {
              if (icon) {
                // just one category is set (take care of `checked` and `ruleKey`).
                categories.push({ icon, title, ruleKey, checked, disabled: false });
              } else {
                // there are more that one category (`symbols` array is set).
                symbols.forEach(s => {
                  s._checked = s.checked;
                  s.disabled = false;
                  categories.push(s);
                });
              }
            });
            projectLayer.setCategories(categories);
            this.legend_categories = categories;
          } else {
            // case to update current categories
            if (nodes.length > 0) {
              nodes.forEach(({ icon, title, symbols = [] }) => {
                if (icon) {
                  symbols = [{ icon, title }];
                }
                this.legend_categories.forEach(c  => {
                  const findSymbol  = symbols.find(s => s.icon === c.icon && s.title === c.title);
                  const disabled    = undefined === c.checked || c.checked;
                  c.disabled        = disabled && undefined === findSymbol;
                  //@since 4.0.x In case of icon change base on map. Check icon in case of same title
                  c.icon            = (symbols.find(s => s.title === c.title && s.icon !== c.icon) || { icon: c.icon }).icon;
                });
              })
            } else {
              this.legend_categories.forEach(c => c.disabled = (undefined === c.checked) || c.checked);
            }
          }
        }
      } catch(e) {
        console.warn(e);
        this.setError();
      }
    },

    /**
     * @since 4.1.0
     */
    async onChangeMapLegendParams() {
      this.mapReady = true;
      if (
        this.layerstree.visible
        && !this.is_external_wms
        && ('toc' === this.legendplace || this.layerstree.categories)
      ) {
        await this.setCategories(false);
      }
    },

    /**
     * @returns {Promise<void>}
     *
     * @listens map~change-map-legend-params
     *
     * @since 4.1.0
     */
    async runInitLayerVisibleAction() {
      await this.setCategories(true);
      if (this.dynamic) {
        await this.setCategories(false);
        GUI.on('change-map-legend-params', this.onChangeMapLegendParams);
      }
      this.initialize = true;
    },

    /**
     * @param {{ '1': () => {}, '2': () => {}}} callbacks hashmap of click event handlers ('1' = click, '2' = double click)
     * @param context
     */
    handleClick(callbacks = {}, context) {
      if (!this.__CLICK_EVENT) {
        console.warn('click mixin not initialized on context:', context);
        return;
      }
      this.__CLICK_EVENT.count += 1;                   // increment click count
      if (!this.__CLICK_EVENT.timeoutID) {             // skip and wait for timeout in order to detect double click
        this.__CLICK_EVENT.timeoutID = setTimeout(() => {
          if (undefined !== callbacks[this.__CLICK_EVENT.count]) {
            callbacks[this.__CLICK_EVENT.count].call(context);
          }
          this.__resetClickMixin();
        }, 300);
      }
    },

    __resetClickMixin() {
      this.__CLICK_EVENT.count     = 0;
      this.__CLICK_EVENT.timeoutID = null;
    },

    __clearClickMixin() {
      this.__resetClickMixin();
      this.__CLICK_EVENT = null;
    },

  },

  /**
   * Inizialize layer (disable, visible etc..)
   */
  created() {
    /**
     * Store `click` and `doubleclick` events on a single vue element.
     *
     * @see https://stackoverflow.com/q/41303982
     */
    this.__CLICK_EVENT = {
      count:     0,                                   // count click events
      timeoutID: null                             // timeoutID return by setTimeout Function
    };

    if (this.isGroup && !this.layerstree.checked) {
      this.handleGroupChecked(this.layerstree);
    }
    if (this.isGroup && !this.root && this.parent_mutually_exclusive && !this.layerstree.mutually_exclusive) {
      this.layerstree.nodes.forEach(node => { node.id && (node.uncheckable = true); })
    }
  },

  beforeDestroy() {
    this.__clearClickMixin();
  },

};
</script>