<!--
  @file
  @since v3.7
-->

<template>

  <li
    v-if                      = "(isGroup && layerstree.toc) || (!isGroup && (!layerstree.projectLayer || layerstree.toc))"
    class                     = "tree-item"
    @contextmenu.prevent.stop = "showContextMenu"
    @click.stop               = "onTreeItemClick"
    :style="{
      marginLeft: !isGroup ? '5px' : '0',
      position: 'relative',
    }"
    :class                    = "{
      selected:         !isGroup || !isTable ? layerstree.selected : false,
      itemmarginbottom: !isGroup,
      disabled:         isInGrey,
      group:            isGroup
    }"
  >
    <!-- GROUP LAYER -->
    <span
      v-if        = "isGroup"
      style       = "padding-right: 2px;"
      :class      = "[
        { bold : isGroup },
        $fa(layerstree.expanded ? 'caret-down' : 'caret-right')
      ]"
      @click.stop = "expandCollapse"
      class       = "root collapse-expande-collapse-icon"
    ></span>

    <!-- GROUP LAYER -->
    <span
      v-if        = "isGroup"
      @click.stop = "toggle()"
      style       = "color: #ffffff"
      :class      = "[triClass()]"
    ></span>

    <!-- TABLE LAYER -->
    <span
      v-else-if = "isTable"
      v-show    = "!layerstree.hidden"
      style     = "padding-left: 18px"
      :class    = "[
        parentFolder ? 'child' : 'root',
        $fa('table')
      ]"
    ></span>

    <template v-else>
      <!-- EXTERNAL LAYER (REMOVABLE NODE) -->
      <span 
        v-if        = "layerstree.external && layerstree.removable"
        style       = "color: red; padding-left: 1px;"
        :class      = "$fa('trash')"
        @click.stop = "removeExternalLayer(layerstree.name, layerstree._type)"
      ></span>

      <!-- HIDDEN NODE (LAYER) -->
      <span
        v-show = "!layerstree.hidden"
        class  = "checkbox-layer"
        :class = "parentFolder ? 'child' : 'root'"
      >
        <span
          v-if             = "'toc' === legendlayerposition || !isGroup && layerstree.categories"
          @click.self.stop = "expandCollapse"
          class            = "collapse-expande-collapse-icon"
          :class           = "$fa(layerstree.visible && layerstree.expanded ? 'caret-down' : 'caret-right')"
        ></span>

        <span
          @click.stop = "toggle()"
          :style      = "{
            paddingLeft: ('toc' === legendlayerposition)
              ? '5px'
              : !isGroup && layerstree.categories
                ? '5px'
                : (!layerstree.legend && layerstree.external)
                  ? '1px'
                  : '18px'
          }"
          :class      = "[
            $fa(layerstree.checked ? 'check': 'uncheck'),
            { 'toc-added-external-layer': (!layerstree.legend && layerstree.external) }
          ]"
        ></span>

      </span>

      <!-- EXTERNAL LAYER  -->
      <span
        v-if   = "layerstree.external && !layerstree.toc"
        style  = "color: #ffff; padding-left: 5px;"
        :class = "$fa('vector' === layerstree._type ? 'draw' : 'image')"
      ></span>

    </template>

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
        <!-- SHOW CURRENT FILTER  -->
        <span
          v-if             = "!isGroup && !layerstree.external && null !== layerstree.filter.current"
          :data-i18n-title = "layerstree.filter.current.name"
          data-placement   = "top"
          data-i18n-raw    = ""
          style            = "cursor: pointer"
          @click.stop      = "removeCurrentFilter"
        >
          <span
            style  = "color: red"
            :class = "$fa('filter')">
          </span>
        </span>
        <!-- VISIBLE NODE TITLE (LAYER or GROUP) -->
        <span>{{ layerstree.title }}</span>
        <!-- LAYER FEATURES COUNT-->
        <span v-if = "!isGroup && showfeaturecount" style = "font-weight: bold">
          [{{getFeatureCount}}]
        </span>

      </span>

      <!-- VISIBLE NODE SELECTED (LAYER) -->
      <div v-if = "(!isGroup && layerstree.selection)">

        <!-- CLEAR SELECTION -->
        <button
          v-if           = "layerstree.selection.active"
          type           = "button"
          class          = "action-button fas fa-broom"
          data-placement = "left"
          :title         = "'Clear Selection'"
          @click.stop    = "clearSelection"
        ></button>

        <!-- TOGGLE FILTER  -->
        <button
          v-if           = "!layerstree.external && (layerstree.selection.active || layerstree.filter.active) && !layerstree.filter.pagination"
          type           = "button"
          class          = "action-button fas fa-filter"
          data-placement = "left"
          :class         = "layerstree.filter.active ? 'active' : ''"
          :title         = "'Enable/Disable filter'"
          @click.stop    = "toggleFilterLayer"
        ></button>

        <!-- SAVE FILTER  -->
        <button
          v-if           = "logged && !layerstree.external && (layerstree.selection.active && layerstree.filter.active)"
          type           = "button"
          class          = "action-button far fa-save"
          data-placement = "left"
          :title         = "'Save Filter'"
          @click.stop    = "saveFilter(layerstree)"
        ></button>

      </div>

    </div>

    <!-- NODE LEGEND (LAYER) -->
    <catalog-legend
      v-if         = "showLayerTocLegend"
      :legendplace = "legendplace"
      :layer       = "layerstree"
    />

    <!-- CHILD NODES (GROUP) -->
    <ul
      v-if   = "isGroup"
      class  = "tree-content-items group"
      :class = "[`g3w-lendplace-${legendplace}`]"
      v-show ="layerstree.expanded"
    >

      <span v-for = "_layerstree in layerstree.nodes" :key = "_layerstree.id || _layerstree.groupId">

        <catalog-tree
          :root                      = "false"
          :legendConfig              = "legend"
          :legendplace               = "legendplace"
          :parentFolder              = "isGroup"
          :layerstree                = "_layerstree"
          :storeid                   = "storeid"
          :parent                    = "layerstree"
          :parent_mutually_exclusive = "!!layerstree.mutually_exclusive"
        />

      </span>
    </ul>

    <button
      v-if           = "layerstree.root"
      type           = "button"
      class          = "fas fa-list"
      data-placement = "left"
      :title         = "'legend'"
      @click.stop    = "showLegendPanel"
      style          = "position: absolute;inset: 0 4px auto auto;padding: 4px 8px;border-radius: 3px;"
    ></button>

    <button
      v-if           = "!isGroup"
      type           = "button"
      class          = "toggle-context-menu fas fa-ellipsis-v"
      data-placement = "left"
      :title         = "'Open menu'"
      @click.stop    = "showContextMenu"
    ></button>

  </li>

</template>

<script>
import ApplicationState        from 'g3w-state';
import GUI                     from 'g3w-app';
import ClickMixin              from 'mixins/click';
import CatalogLegend           from 'components/CatalogLegend.vue';
import { getCatalogLayerById } from 'utils/getCatalogLayerById';

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

  components: {
    CatalogLegend
  },

  mixins: [ClickMixin],

  data() {
    return {
      expanded:       this.layerstree.expanded,
      isGroupChecked: true,
      controltoggled: false,
      n_childs:       null,
      filtered:       false,
      logged:         undefined !== ApplicationState.user.id, //@since 3.10.0
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

    showLegendLayer() {
      return !this.layerstree.exclude_from_legend;
    },

    showLayerTocLegend() {
      return !this.isGroup && this.showLegendLayer && this.layerstree.geolayer;
    },

    isGroup() {
      return !!this.layerstree.nodes;
    },

    legendlayerposition() {
      return (this.showLegendLayer && this.layerstree.legend) ? this.legendplace : 'tab';
    },

    showscalevisibilityclass() {
      return !this.isGroup && this.layerstree.scalebasedvisibility;
    },

    showScaleVisibilityToolip() {
      return this.showscalevisibilityclass && this.layerstree.disabled && this.layerstree.checked;
    },

    isTable() {
      return !this.isGroup && !this.layerstree.geolayer && !this.layerstree.external;
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

    isInGrey() {
      return (!this.isGroup && !this.isTable && !this.layerstree.external && (!this.layerstree.visible || this.layerstree.disabled));
    },

    /**
     * @since 3.8.0
     */
    getFeatureCount() {
      return Object.values(this.layerstree.featurecount).reduce((total, categoryFeatureCount) => total + 1 * categoryFeatureCount, 0);
    },

  },

  watch: {

    'layerstree.checked'() {
      if (this.isGroup) {
        this.handleGroupChecked(this.layerstree);
      } else {
        this.handleLayerChecked(this.layerstree);
      }
    }

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

    triClass() {
      return this.g3wtemplate.getFontClass(this.layerstree.checked ? 'check' : 'uncheck');
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

  },

  /**
   * Inizialize layer (disable, visible etc..)
   */
  created() {
    if (this.isGroup && !this.layerstree.checked) {
      this.handleGroupChecked(this.layerstree);
    }
    if (this.isGroup && !this.root && this.parent_mutually_exclusive && !this.layerstree.mutually_exclusive) {
      this.layerstree.nodes.forEach(node => { node.id && (node.uncheckable = true); })
    }
  },

};
</script>