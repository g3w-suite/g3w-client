<!--
  @file
  @since v3.7
-->

<template>

  <li
    v-if                      = "isGroup || !layerstree.projectLayer || layerstree.toc"
    class                     = "tree-item"
    @contextmenu.prevent.stop = "showContextMenu"
    @click.stop               = "onTreeItemClick"
    :style="{
      marginLeft: !isGroup ? '5px' : '0'
    }"
    :class                    = "{
      selected: !isGroup || !isTable ? layerstree.selected : false,
      itemmarginbottom: !isGroup,
      disabled: isInGrey,
      group: isGroup
    }"
  >
    <!-- GROUP LAYER -->
    <span
      v-if        = "isGroup"
      style       = "padding-right: 2px;"
      :class      = "[
        { bold : isGroup },
        g3wtemplate.getFontClass(layerstree.expanded ? 'caret-down' : 'caret-right')
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
        g3wtemplate.getFontClass('table')
      ]"
    ></span>

    <template v-else>

      <!-- EXTERNAL LAYER (REMOVABLE NODE) -->
      <span
        v-if        = "layerstree.external && layerstree.removable"
        style       = "color: red; padding-left: 1px;"
        :class      = "g3wtemplate.getFontClass('trash')"
        @click.stop = "removeExternalLayer(layerstree.name, layerstree._type)"
      ></span>

      <!-- EXTERNAL LAYER (DOWNLOADABLE NODE) -->
      <span
        v-if   = "layerstree.external && layerstree.download"
        style  = "color: #ffffff; margin-left: 5px;"
        :class = "g3wtemplate.getFontClass('download')"
        @click = "downloadExternalLayer(layerstree.download)"
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
          :class           = "g3wtemplate.getFontClass(layerstree.visible && layerstree.expanded ? 'caret-down' : 'caret-right')"
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
            g3wtemplate.getFontClass(layerstree.checked ? 'check': 'uncheck'),
            { 'toc-added-external-layer': (!layerstree.legend && layerstree.external) }
          ]"
        ></span>

      </span>

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
          highlightlayer: isHighLight,
          scalevisibility: showscalevisibilityclass
        }"
        class            = "skin-tooltip-top g3w-long-text"
        data-placement   = "top"
        v-t-tooltip.text = "showScaleVisibilityToolip ? `minscale:${layerstree.minscale} - maxscale:${layerstree.maxscale}` : ''"
        :current-tooltip = "showScaleVisibilityToolip ? `minscale:${layerstree.minscale} - maxscale: ${layerstree.maxscale}` : ''"
      >
        <!-- SHOW CURRENT FILTER  -->
        <span
          v-if                        = "!isGroup && !layerstree.external && null !== layerstree.filter.current"
          :current-tooltip            = "layerstree.filter.current.name"
          v-t-tooltip:top.create.text = "layerstree.filter.current.name"
          style                       = "cursor: pointer"
          @click.stop                 = "removeCurrentFilter"
        >
          <span
            style  = "color: red"
            :class = "g3wtemplate.getFontClass('filter')">
          </span>
        </span>
        <!-- VISIBLE NODE TITLE (LAYER or GROUP) -->
        <span>{{ layerstree.title }}</span>
        <!-- LAYER FEATURES COUNT-->
        <span v-if="!isGroup && showfeaturecount" style="font-weight: bold">
          [{{getFeatureCount}}]
        </span>

      </span>

      <!-- VISIBLE NODE SELECTED (LAYER) -->
      <div v-if = "(!isGroup && layerstree.selection)">

        <!-- CLEAR SELECTION -->
        <span
          v-if                         = "layerstree.selection.active"
          class                        = "action-button skin-tooltip-left selection-filter-icon"
          data-placement               = "left"
          data-toggle                  = "tooltip"
          data-container="body"
          :class                       = "g3wtemplate.getFontClass('clear')"
          @click.caputure.prevent.stop = "clearSelection"
          v-t-tooltip.create           = "'layer_selection_filter.tools.clear'"
        ></span>

        <!-- TOGGLE FILTER  -->
        <span
          v-if                         = "!layerstree.external && (layerstree.selection.active || layerstree.filter.active)"
          class                        = "action-button skin-tooltip-left selection-filter-icon"
          data-placement               = "left"
          data-toggle                  = "tooltip"
          data-container="body"
          :class                       = "[
            g3wtemplate.getFontClass('filter'),
            layerstree.filter.active  ? 'active' : '',
          ]"
          @click.caputure.prevent.stop = "toggleFilterLayer"
          v-t-tooltip.create           = "'layer_selection_filter.tools.filter'"
        ></span>

        <!-- SAVE FILTER  -->
        <span
          v-if                         = "logged && !layerstree.external && (layerstree.selection.active && layerstree.filter.active)"
          class                        = "action-button skin-tooltip-left selection-filter-icon"
          data-placement               = "left"
          data-toggle                  = "tooltip"
          :class                       = "g3wtemplate.getFontClass('save')"
          @click.caputure.prevent.stop = "saveFilter(layerstree)"
          v-t-tooltip.create           = "'layer_selection_filter.tools.savefilter'"
        ></span>

      </div>

    </div>

    <!-- NODE LEGEND (LAYER) -->
    <catalog-layer-legend
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

        <catalog-tristate-tree
          :root                      = "false"
          :legendConfig              = "legend"
          :legendplace               = "legendplace"
          :highlightlayers           = "highlightlayers"
          :parentFolder              = "isGroup"
          :layerstree                = "_layerstree"
          :storeid                   = "storeid"
          :parent                    = "layerstree"
          :parent_mutually_exclusive = "!!layerstree.mutually_exclusive"
        />

      </span>
    </ul>

  </li>

</template>

<script>
import { VM }                      from 'g3w-eventbus';
import ApplicationState            from "store/application";
import GUI                         from 'services/gui';
import ClickMixin                  from 'mixins/click';
import CatalogLayerLegend          from 'components/CatalogLayerLegend.vue';
import { downloadFile }            from 'utils/downloadFile';
import { getCatalogLayerById }     from 'utils/getCatalogLayerById';

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
  name: 'catalog-tristate-tree',

  props : [
    'layerstree',
    'storeid',
    'legend',
    'legendplace',
    'highlightlayers',
    'parent_mutually_exclusive',
    'parentFolder',
    'externallayers',
    'root',
    'parent'
  ],

  components: {
    CatalogLayerLegend
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
      return !!this.layerstree.nodes
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
      return this.layerstree.hidden && (true === this.layerstree.hidden);
    },

    selected() {
      this.layerstree.selected = (this.layerstree.disabled && this.layerstree.selected) ? false : this.layerstree.selected;
    },

    isHighLight() {
      return (
        // project layer
        (
          this.highlightlayers &&
          !this.isGroup &&
          getCatalogLayerById(this.layerstree.id).getTocHighlightable() &&
          this.layerstree.visible
        ) ||
        // external layer
          (
          this.layerstree.external &&
          this.layerstree.visible &&
          "vector" /* <-- what the heck? */ && this.layerstree._type &&
          true === this.layerstree.tochighlightable
        )
      );
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
      return getCatalogLayerById(this.layerstree.id).deleteFilterToken();
    },

    /**
     * Handle change checked property of group
     *
     * @param {boolean} group.checked
     * @param {uknown}  group.parentGroup
     * @param {uknown}  group.nodes
     */
    handleGroupChecked(group) {
      const map = GUI.getService('map');

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

      const visible            = group.parentGroup ? group.parentGroup.checked : true;
      const mutually_exclusive = group.parentGroup && group.parentGroup.mutually_exclusive;

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
     */
    handleLayerChecked(layer) {

      const map = GUI.getService('map'); 

      // external layer (eg. temporary layer through `addlayerscontrol`)
      if (!layer.projectLayer) {
        layer.visible = layer.checked;
        layer.setVisible(layer.checked);
        map.emit('change-layer-visibility', { id: layer.id, visible: layer.checked });
        return;  // NB exit early!
      }

      // project layer (eg. qgis layer)
      const qlayer  = getCatalogLayerById(layer.id);
      const checked = layer.checked;

      qlayer.setVisible(checked ? !layer.disabled : false)

      if (checked && layer.parentGroup.mutually_exclusive) {
        layer.parentGroup.nodes.forEach(n => n.checked = n.id === layer.id);
      }

      // traverse parent groups
      let g = layer.parentGroup;
      while (checked && g) {
        g.checked = true;
        g         = g.parentGroup;
      }

      VM.$emit('treenodevisible', qlayer);
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
     * @fires VM~activefiltertokenlayer
     */
    toggleFilterLayer() {
      VM.$emit('activefiltertokenlayer', this.storeid, this.layerstree);
    },

    /**
     * @fires VM~unselectionlayer
     */
    clearSelection() {
      VM.$emit('unselectionlayer', this.storeid, this.layerstree);
    },

    toggle() {
      this.layerstree.checked = !this.layerstree.checked;
    },

    expandCollapse() {
      this.layerstree.expanded = !this.layerstree.expanded;
    },

    /**
     * Select legend item
     *
     * @fires VM~treenodeselected
     */
    select() {
      // `undefined === selected` means unselectable layer (eg. external/temporary  WMS)
      if (
        undefined !== this.layerstree.selected &&
        ((!this.isGroup && !this.isTable) || (this.layerstree.external && false === this.layerstree.projectLayer))
      ) {
        VM.$emit('treenodeselected', this.layerstree);
      }
    },

    /**
     * @TODO refactor this, almost the Same as `CatalogContextMenu.vue::zoomToLayer(layer)`
     *
     * @since 3.10.0
     */
    maybeZoomToLayer(layer) {
      if (this.canZoom(this.layerstree)) {
        GUI
          .getService('map')
          .goToBBox(
            [layer.bbox.minx, layer.bbox.miny, layer.bbox.maxx, layer.bbox.maxy],
            layer.epsg
          );
      }
    },

    /**
     * @TODO refactor this, almost the same as: `CatalogContextMenu.vue::canZoom(layer))`
     *
     * @since v3.8
     */
    canZoom(layer) {
      return (layer.bbox && [layer.bbox.minx, layer.bbox.miny, layer.bbox.maxx, layer.bbox.maxy].find(coordinate => coordinate > 0));
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

    downloadExternalLayer(download) {
      if (download.file) {
        downloadFile(download.file);
      } else if (download.url) {
        /** @FIXME missing implementation */
      }
    },

    removeExternalLayer(name) {
      GUI.getService('map').removeExternalLayer(name);
    },

    /**
     * @param evt
     * 
     * @fires VM~show-layer-context-menu
     * @fires VM~show-project-context-menu
     * 
     * @since 3.10.0
     */
    showContextMenu(evt) {
      if (
        !this.isGroup &&
        (this.layerstree.openattributetable || this.layerstree.downloadable || this.layerstree.geolayer || this.layerstree.external)
      ) {
        VM.$emit('show-layer-context-menu', evt, this.layerstree);
      } else if (this.isGroup && true === this.layerstree.root) {
        VM.$emit('show-project-context-menu', evt);
      }
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

  async mounted() {
    await this.$nextTick();
    $('span.scalevisibility').tooltip();
  }

};
</script>