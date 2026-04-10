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
    @keydown.enter.stop       = "onTreeItemClick"
    tabindex                  = "0"
    role                      = "button"
    :class                    = "{
      selected:             layerstree.selected,
      disabled:             isDisabled,
      group:                isGroup,
      table:                isTable,
      external:             layerstree.external,
      'mutually-exclusive': parent_mutually_exclusive
    }"
  >

    <!-- NODE REMOVE -->
    <button 
      v-if        = "!isTable && !isGroup && layerstree.external && layerstree.removable"
      type        = "button"
      @click.stop = "removeExternalLayer(layerstree.name, layerstree._type)"
      title       = "Remove"
    >
      <i aria-hidden = "true" class = "fas fa-trash" style = "color: red;"></i>
    </button>

    <!-- NODE TOGGLER -->
    <button
      type        = "button"
      @click.stop = "expandCollapse"
      class       = "tree-toggler"
      :hidden = "!(isGroup || (!isTable && ('toc' === legend_position || layerstree.categories)) && !layerstree.hidden)"
    >
      <i aria-hidden = "true" :class = "layerstree.expanded && (isGroup || layerstree.visible) ? 'fas fa-caret-down' : 'fas fa-caret-right'"></i>
      <span hidden>{{ $t('Enlarge / Reduce') }}</span>
    </button>

    <!-- NODE VISIBILITY -->
    <input
      v-if        = "isGroup || !isTable"
      v-show      = "isGroup || !layerstree.hidden"
      type        = "checkbox"
      @click.stop = "toggle()"
      v-model     = "layerstree.checked"
      role        = "button"
      aria-label  = "Show/Hide"
    />

    <!-- NODE TYPE -->
    <i v-if = "isTable"                                                                      v-show = "!layerstree.hidden" aria-hidden = "true" class = "fas fa-table"></i>
    <i v-if = "isGroup && !layerstree.root"                                                  v-show = "!layerstree.hidden" aria-hidden = "true" class = "fas fa-layer-group"></i>
    <i v-if = "!isTable && !isGroup && layerstree.external && 'vector' === layerstree._type" v-show = "!layerstree.hidden" aria-hidden = "true" class = "fas fa-draw-polygon" style = "color: #fff;"></i>
    <i v-if = "!isTable && !isGroup && layerstree.external && 'vector' !== layerstree._type" v-show = "!layerstree.hidden" aria-hidden = "true" class = "far fa-image"        style = "color: #fff;"></i>

    <!-- REMOVE CURRENT FILTER  -->
    <button
      v-if             = "(!layerstree.hidden || isGroup) && !isGroup && !layerstree.external && null !== layerstree.filter.current"
      type             = "button"
      :data-i18n-title = "layerstree.filter.current.name"
      data-placement   = "top"
      data-i18n-raw    = ""
      class            = "action-button"
      style            = "box-shadow: unset;"
      @click.stop      = "removeFilter"
    >
      <i aria-hidden = "true" class = "fas fa-filter" style = "color: red"></i>
    </button>

    <!-- NODE TITLE -->
    <span
      v-show           = "!layerstree.hidden || isGroup"
      class            = "tree-node-title"
      :data-i18n-title = "has_scale_visibility_toolip ? `minscale:${layerstree.minscale} - maxscale:${layerstree.maxscale}` : ''"
      data-placement   = "top"
      data-i18n-raw    = ""
    >
      {{ layerstree.title }} <b v-if = "!isGroup && has_feature_count"> [{{ getFeatureCount }}] </b>
    </span>

    <!-- CLEAR SELECTION -->
    <button
      v-if           = "(!layerstree.hidden || isGroup) && !isGroup && layerstree.selection && layerstree.selection.active"
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
      v-if           = "  !isGroup  //is not a group (layer)
                          && !layerstree.external // in not an external layer
                          && !layerstree.hidden  //is not hidden layer
                          && !layerstree.filter.pagination //has no pagination
                          && (
                              (layerstree.filter && layerstree.filter.current && layerstree.filter.current.name) //has current filter set from stored filter
                              || (layerstree.selection && layerstree.selection.active) // has a selection active
                            )"
      type           = "button"
      class          = "action-button"
      title          = "Enable/Disable filter"
      data-placement = "left"
      :class         = "layerstree.filter.active ? 'active' : ''"
      @click.stop    = "toggleFilter"
    >
      <i aria-hidden = "true" class = "fas fa-filter"></i>
    </button>

    <!-- SAVE FILTER  -->
    <button
      v-if           = "(!layerstree.hidden || isGroup) && !isGroup && layerstree.selection && logged && !layerstree.external && layerstree.selection.active && layerstree.filter.active"
      type           = "button"
      class          = "action-button"
      title          = "Save Filter"
      data-placement = "left"
      @click.stop    = "saveFilter(layerstree)"
    >
      <i aria-hidden = "true" class = "far fa-save"></i>
    </button>

    <!-- TOGGLE LEGEND PANEL -->
    <button
      v-if           = "layerstree.root"
      type           = "button"
      data-placement = "left"
      title          = "legend"
      @click.stop    = "showLegendPanel"
    >
      <i aria-hidden = "true" class = "fas fa-list"></i>
    </button>

    <!-- TOGGLE CONTEXT MENU -->
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

    <!-- NODE LEGEND (LAYER) -->
    <figure
      v-if                = "has_legend"
      v-show              = "show_legend"
      class               = "tree-legend"
      v-disabled          = "!is_external_wms && loading_legend"
      @click.stop.prevent = ""
      role                = "presentation"
    >
      <div  v-show = "loading_legend || legend_tree.loading" class = "bar-loader"></div>
      <img
        v-if       = "is_external_wms" 
        loading    = "lazy"
        :src       = "legend_tree.url" 
        @loaderror = "setError()"
        @load      = "urlLoaded()"
        alt        = ""
      >
      <template v-else>
        <div
          v-for      = "(category, index) in legend_categories"
          style      = "display: flex; align-items: flex-start; width: 100%"
          v-disabled = "category.disabled"
          @contextmenu.prevent.stop
        >

          <input
            v-if        = "category.ruleKey"
            type        = "checkbox"
            @click.stop = "toggleCategory(index)"
            v-model     = "category.checked"
            role        = "button"
            aria-label  = "Show/Hide"
          />

          <img
            v-if   = "('toc' === legendplace)"
            :src   = "category.icon && `data:image/png;base64,${category.icon}`"
            @error = "setError()"
            @load  = "urlLoaded()"
            alt    = ""
            style  = "margin: 4px 4px 0 5px;"
          >

          <span
            v-if        = "('tab' === legendplace && category.ruleKey) || ('toc' === legendplace)"
            class       = "g3w-long-text"
            style       = "padding-left: 3px;"
          >
            <span>{{category.title}}</span>
            <b v-if = "has_feature_count && undefined !== category.ruleKey"> [{{layerstree.featurecount[category.ruleKey]}}] </b>
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
        :legendplace               = "legendplace"
        :layerstree                = "_layerstree"
        :storeid                   = "storeid"
        :parent                    = "layerstree"
        :parent_mutually_exclusive = "!!layerstree.mutually_exclusive"
      />
    </ul>

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
    has_feature_count() {
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

    legend_position() {
      return (!this.layerstree.exclude_from_legend && this.layerstree.legend) ? this.legendplace : 'tab';
    },

    has_scale_visibility_toolip() {
      return !this.isGroup && this.layerstree.scalebasedvisibility && this.layerstree.disabled && this.layerstree.checked;
    },

    isHidden() {
      return true === this.layerstree?.hidden;
    },

    selected() {
      this.layerstree.selected = (this.layerstree.disabled && this.layerstree.selected) ? false : this.layerstree.selected;
    },

    isDisabled() {
      return !this.isGroup && !this.isTable && !this.layerstree.checked && (!this.layerstree.visible || this.layerstree.disabled);
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
        this.onGroupChecked(this.layerstree);
      } else {
        this.onLayerChecked(this.layerstree);
      }
      //@since 4.0.7 In case of map theme change and layers tree is not root, reset map theme
      if (!this.layerstree.root && !ApplicationState.map_theme.change) {
        ApplicationState.map_theme.theme = null; // @since 4.0.7 on group or layer change , set map_theme null
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

          // Get all legend graphics of a layer when start (exclude wms source)
          if (!this.is_external_wms && true === this.layerstree.visible) {
            await this.initLegend();
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
        await this.initLegend();
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
    removeFilter() {
      return getCatalogLayerById(this.layerstree.id).deleteToken();
    },

    /**
     * Handle change checked property of group
     *
     * @param {boolean} group.checked
     * @param {uknown}  group.parentGroup
     * @param {uknown}  group.nodes
     */
    onGroupChecked(group) {

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
     * Handle visibilty change (layer.checked property)
     *
     * @param {boolean} layer.checked
     * @param {string}  layer.id
     * @param {boolean} layer.disabled
     * @param {boolean} layer.projectLayer
     * @param {uknown}  layer.parentGroup
     */
    onLayerChecked(layer) {

      // external layer (eg. temporary layer through `addlayerscontrol`)
      if (!layer.projectLayer) {
        layer.visible = layer.checked;
        layer.setVisible(layer.checked);
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
    },

    /**
     * Save layer filter
     *
     * @since 3.9.0
     */
    saveFilter(layerstree) {
      getCatalogLayerById(layerstree.id).saveFilter();
    },

    async toggleFilter() {
      this.layerstree.filter.active = await ApplicationState.layers[this.storeid].getLayerById(this.layerstree.id).toggleToken();
    },

    /**
     * Remove layer from queryresults selection
     */
    async clearSelection() {
      const storeid = this.storeid;
      const layer = this.layerstree;

      if (!layer) {
        return console.warn('undefined layer');
      }

      const action = layer.external && GUI.getActionLayerById({ layer, id: 'selection' });

      // PROJECT LAYER
      if (!layer.external && storeid) {
        await ApplicationState.layers[storeid].getLayerById(layer.id).clearSelectionFids();
      }

      // EXTERNAL LAYER
      if (layer.external) {
        layer.selection.active = false;
        layer.selection.features.forEach((feature, i) => {
          // skip when ..
          if (!feature.selected) {
            return;
          }
          feature.selected = false;
          if (action) {
            action.state.toggled[i] = false;
          }
          GUI.defaultsLayers.selectionLayer.getSource().removeFeature(feature);
        });
      }
      //@since 4.0.4 Need to set to false eventually features of layer in queryresults service
      if (!layer.external) {
        (GUI.state.queried_layers.find(l => layer.id === l.id)?.features || []).forEach(f => f.selected = false);
      }
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
     */
    select() {
      // `undefined === selected` means unselectable layer (eg. external/temporary  WMS)
      if (
        undefined !== this.layerstree.selected 
        && ((!this.isGroup && !this.isTable) || (this.layerstree.external && false === this.layerstree.projectLayer))
      ) {
        GUI.selectLayer(this.layerstree.id);
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
      this.CLICK_COUNT += 1; // increment click count

      // skip and wait for timeout in order to detect double click
      if (this.CLICK_TIMER) {
        return;
      }

      this.CLICK_TIMER = setTimeout(() => {
        if (1 === this.CLICK_COUNT && !this.isTable && !this.isGroup) {
          this.select();
        }
        if (1 === this.CLICK_COUNT && this.isGroup) {
          this.expandCollapse();
        }
        if (2 === this.CLICK_COUNT && !this.isTable) {
          this.maybeZoomToLayer(this.layerstree)
        }
        this.CLICK_COUNT = 0;
        this.CLICK_TIMER = null;
      }, 300);
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
      ApplicationState.map_theme.theme      = null; // @since 4.0.7 set map_theme null on ckick on category

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
    async onLegendChange() {
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
    async initLegend() {
      await this.setCategories(true);
      if (this.dynamic) {
        await this.setCategories(false);
        GUI.on('change-map-legend-params', this.onLegendChange);
      }
      this.initialize = true;
    },

  },

  /**
   * Inizialize layer (disable, visible etc..)
   */
  created() {
    this.CLICK_COUNT = 0;    // count click events
    this.CLICK_TIMER = null; // timeoutID return by setTimeout Function

    if (this.isGroup && !this.layerstree.checked) {
      this.onGroupChecked(this.layerstree);
    }
    if (this.isGroup && !this.root && this.parent_mutually_exclusive && !this.layerstree.mutually_exclusive) {
      this.layerstree.nodes.forEach(node => { node.id && (node.uncheckable = true); })
    }
  },

  beforeDestroy() {
    this.CLICK_COUNT = 0;
    this.CLICK_TIMER = null;
  },

};
</script>