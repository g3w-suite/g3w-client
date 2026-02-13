<!--
  @file
  @since v3.7
-->

<template>
  <div class = "catalog">

    <!-- THEME SELECTOR -->
    <div
      id    = "g3w-catalog-toc-layers-toolbar"
    >
      <catalog-themes
        :map_themes       = "ApplicationState.project.state.map_themes"
        :layerstrees      = "ApplicationState.catalog.layerstrees"
        @change-map-theme = "changeMapTheme"
      />
    </div>

    <!-- LAYER TREES -->
    <div
      id     = "layers"
      style  = "padding-top: 5px;"
    >

      <ul
        v-for = "root in ApplicationState.catalog.layerstrees"
        :key  = "root.storeid"
        class = "tree-root root project-root"
      >
        <catalog-tree
          v-for                      = "tree in root.tree"
          :key                       = "tree.id"
          :layerstree                = "tree"
          class                      = "item"
          :parentFolder              = "false"
          :root                      = "true"
          :legendplace               = "ApplicationState.project.state.legend_position || 'tab'"
          :parent_mutually_exclusive = "false"
          :storeid                   = "root.storeid"
        />
      </ul>

      <!-- EXTERNAL LAYERS -->
      <ul v-if = "ApplicationState.catalog.external.wms.length || ApplicationState.catalog.external.tms.length || ApplicationState.catalog.external.vector.length" class = "g3w-external_layers-group">
        <li>
          <div style = "display: flex; align-items: baseline; margin-bottom: 5px;">
            <span
              style       = "padding-right: 2px; padding-left: 4px; width: 20px; font-size: 1.1em; cursor: pointer;"
              :class      = "$fa(externalayers.collapsed ? 'caret-right' : 'caret-down')"
              @click.stop = "expandCollapseExternaLayers"
              class       = "collapse-expande-collapse-icon bold"
            ></span>
            <span
              @click.stop = "toggleExternalLayers"
              style       = "padding-right: 5px; cursor: pointer;"
              :class      = "$fa(externalayers.checked ? 'check': 'uncheck')"
            ></span>
            <span style = "font-weight: bold" v-t = "'EXTERNAL LAYERS'"></span>
            <span 
              style       = "color: red; padding-right: 3px; margin-left: auto; margin-right: 8px; cursor: pointer;"
              :class      = "$fa('trash')"
              @click.stop = "removeExternalLayers"
            ></span>
          </div>
        </li>
        <catalog-tree
          v-show          = "!externalayers.collapsed"
          v-for           = "wms in ApplicationState.catalog.external.wms"
          :key            = "wms.id"
          :externallayers = "ApplicationState.catalog.external.wms"
          :layerstree     = "wms"
          @layerchecked   = "updateExternalLayersChecked"
          class           = "item"
        />
        <!-- @since 4.1.0 add tms layers -->
        <catalog-tree
          v-show          = "!externalayers.collapsed"
          v-for           = "tms in ApplicationState.catalog.external.tms"
          :key            = "tms.id"
          :externallayers = "ApplicationState.catalog.external.tms"
          :layerstree     = "tms"
          @layerchecked   = "updateExternalLayersChecked"
          class           = "item"
        />
        <catalog-tree
          v-show          = "!externalayers.collapsed"
          v-for           = "vector in ApplicationState.catalog.external.vector"
          :key            = "vector.id"
          :externallayers = "ApplicationState.catalog.external.vector"
          @layerchecked   = "updateExternalLayersChecked"
          :layerstree     = "vector"
          class           = "item"
        />
      </ul>

    </div>

    <div
      v-if = "has_related_maps"
      style  = "
        position: sticky;
        bottom: 0;
        background-color: var(--bgcolor);
        display: flex;
        text-align: center;
        line-height: 48px;
        color: #fff;
        border-top: 2px solid var(--skin-color);
        margin-top: 12px;
        justify-content: space-around;
      "
    >
      <a
        href        = "#"
        @click.stop = "showaddLayerModal"
      >
        <i :class = "$fa('layers')"></i> <b>{{ $t('Add Layer') }}</b>
      </a>
      <a
        v-if           = "has_related_maps && !ApplicationState.iframe"
        href           = "#"
        @click.stop = "openChangeMapMenu"
      >
        <i :class = "$fa('refresh')"></i> <b>{{ $t('changemap') }}</b>
      </a>
    </div>

  </div>
</template>

<script>

import ApplicationState        from 'g3w-state';
import GUI                     from 'g3w-app';
import { XHR }                 from 'utils/XHR';
import { getCatalogLayerById } from 'utils/getCatalogLayerById';

import CatalogThemes           from 'components/CatalogThemes.vue';
import CatalogTree             from 'components/CatalogTree.vue';

export default {

  /** @since 3.8.6 */
  name: 'catalog',

  data() {
    return {
      ApplicationState,
      externalayers:    {
        checked:   false,
        collapsed: false,
      },
    }
  },

  components: {
    CatalogThemes,
    CatalogTree,
  },

  computed: {

    /**
     * @returns {boolean} whether it should list any related projects or maps.
     *
     * @since 3.8.0
     */
     has_related_maps() {
      return window.initConfig.macrogroups.length + window.initConfig.groups.length + window.initConfig.projects.length > 1;
    },

  },

  methods: {

    /**
     * @since 4.1.0
     */
    expandCollapseExternaLayers() {
      this.externalayers.collapsed = !this.externalayers.collapsed;
    },

    /**
     * @since 4.1.0
     */
    toggleExternalLayers() {
      this.externalayers.checked = !this.externalayers.checked;
      [
        ...(this.ApplicationState.catalog.external?.vector || []),
        ...(this.ApplicationState.catalog.external?.wms || []),
        ...(this.ApplicationState.catalog.external?.tms || []),
      ].forEach(l => l.checked = this.externalayers.checked);
    },

    /**
     * @since 4.1.0 Remove external layers
     */
    removeExternalLayers() {
      [
        ...(this.ApplicationState.catalog.external?.vector || []),
        ...(this.ApplicationState.catalog.external?.wms || []),
        ...(this.ApplicationState.catalog.external?.tms || []),
      ].forEach(l =>  GUI.removeExternalLayer(l.name));
    },

    onLegendError(url) {
      url.error   = true;
      url.loading = false;
    },

    onLegendLoad(url) {
      url.loading = false;
    },

    /**
     * get map Theme_configuration
     */
    async getMapThemeFromThemeName(theme) {
      const project = ApplicationState.project;
      // get map theme configuration from map_themes project config
      const config  = Object.values(project.state.map_themes).flat().find(c => theme === c.theme );
      if (config && undefined === config.layerstree) {
        try {
          const response = await XHR.get({ url: `${project.urls.map_themes}${theme}/` });
          if (response.result) {
            config.layerstree = response.data;
          }
        } catch(e) {
          console.warn('Error while retreiving map theme configuration', e);
        }
      }
      return config;
    },

    /**
     * ORIGINAL SOURCE: src/app/core/project/project.js@v3.10.2
     * 
     * Set properties (checked and visible) from view to layerstree
     * 
     * @param map_theme map theme name
     * @param layerstree // current layerstree of TOC
     * 
     * @since 3.11.0
     */
    async setLayersTreePropertiesFromMapTheme({ map_theme, layerstree }) {
      const project  = ApplicationState.project;
      layerstree     = undefined !== layerstree ? layerstree : project.state.layerstree;
      /** map theme config */
      const theme    = await this.getMapThemeFromThemeName(map_theme);
      // create a chages need to apply map_theme changes to map and TOC
      const changes  = { layers: {} }; // key is the layer id and object has style, visibility change (Boolean)
      const promises = [];
      /**
       * Traverse current layerstree of TOC and get changes with the new one related to map_theme choose
       * @param mapThemeLayersTree // new mapLayerTree
       * @param layerstree // current layerstree
       */
      const groups = [];
      const traverse = (mapThemeLayersTree, layerstree, checked) => {
        mapThemeLayersTree
          .forEach((node, index) => {
            if (node.nodes) { // case of a group
              groups.push({
                node,
                group: layerstree[index]
              });
              traverse(node.nodes, layerstree[index].nodes, checked && node.checked);
            } else {
              // case of layer
              node.style = theme.styles[node.id]; // set style from map_theme
              if (layerstree[index].checked !== node.visible) {
                changes.layers[node.id] = {
                  visibility: true,
                  style:      false
                };
              }
              layerstree[index].checked = node.visible;
              // if it has a style settled
              if (node.style) {
                const promise = new Promise(resolve => {
                  const setCurrentStyleAndResolvePromise = node => {
                    if (undefined === changes.layers[node.id]) {
                      changes.layers[node.id] = {
                        visibility: false,
                        style:      false
                      }
                    }
                    changes.layers[node.id].style = project.getLayerById(node.id).setCurrentStyle(node.style);
                    resolve();
                  };
                  if (project.getLayersStore()) { setCurrentStyleAndResolvePromise(node) }
                  else { (node => setTimeout(() => setCurrentStyleAndResolvePromise(node)))(node) }// case of starting project creation
                });
                promises.push(promise);
              }
            }
        });
      };
      traverse(theme.layerstree, layerstree);

      await Promise.allSettled(promises);

      // all groups checked after layer checked so is set checked but not visible
      groups.forEach(({ group, node: { checked, expanded }}) => {
        group.checked  = checked;
        group.expanded = expanded;
      });

      return changes // eventually, information about changes (for example style etc..)
    },

    /**
     * Change view
     *
     * @fires GUI~layer-change-style since 4.1.0
     */
    async changeMapTheme(map_theme) {
      GUI.closeContent();

      // change map theme
      this.ApplicationState.catalog.layerstrees[0].checked = true;

      const changes = (await this.setLayersTreePropertiesFromMapTheme({
        map_theme,
        rootNode:   this.ApplicationState.catalog.layerstrees[0],
        layerstree: this.ApplicationState.catalog.layerstrees[0].tree[0].nodes
      })).layers;

      // get all layers with styles
      const layers  = Object.keys(changes).filter(id => changes[id].style);
      const styles  = (await this.getMapThemeFromThemeName(map_theme)).styles;

      // clear categories
      layers.forEach(id => {
        if (!changes[id].visible) {
          const layer = getCatalogLayerById(id);
          layer.clearCategories();
          layer.change();
        }
      });

      // apply styles on each layer
      layers.forEach(id => GUI.emit('layer-change-style', { layerId: id, style: styles[id] }));

    },

    /**
     * ORIGINAL SOURCE: src/app/gui/queryresults/queryresultsservice.js::removeFromSelection
     * 
     * Remove layer from queryresults selection
     *
     * @since 3.10.0
     */
   async onUnSelectionLayer(storeid, layer) {
      if (!layer) {
        return console.warn('undefined layer');;
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

    /**
     * @TODO add description
     *
     * @since 3.10.0
     */
    async onActiveToken(storeid, layerstree) {
      layerstree.filter.active = await ApplicationState.layers[storeid].getLayerById(layerstree.id).toggleToken();
    },

    /**
     * Handle visibilty change on legend item
     *
     * @fires GUI~cataloglayervisible
     *
     * @since 3.10.0
     */
    onTreeNodeVisible(layer) {
      GUI.emit('cataloglayervisible', layer);
    },

    /**
     * Handle legend item select (single mouse click ?)
     *
     * @since 3.10.0
     */
    onTreeNodeSelected(node) {
      GUI.selectLayer(node.id);
    },

    /**
     * @since 3.11.0
     */
    showaddLayerModal() {
      $('#modal-addlayer').modal('show');
    },

    /**
     * @since 3.11.0
     */
    openChangeMapMenu() {
      $('#modal-changemap').modal('show');
    },

    /**
     * @since 4.1.0
     */
    updateExternalLayersChecked() {
      this.externalayers.checked = [
        ...(ApplicationState.catalog.external?.vector || []),
        ...(ApplicationState.catalog.external?.wms || []),
      ].every(l => l.checked)
    },

  },

  watch: {

    'ApplicationState.catalog.external.vector': {
      immediante: true,
      handler() {
        this.updateExternalLayersChecked();
      },
    },

    'ApplicationState.catalog.external.wms': {
      immediante: true,
      handler() {
        this.updateExternalLayersChecked();
      },
    },

  },

  /**
   * @listens GUI~unselectionlayer
   * @listens GUI~activefiltertokenlayer
   * @listens GUI~treenodevisible
   * @listens GUI~treenodeselected
   * @listens GUI~layer-change-style
   */
  created() {
    GUI.on('unselectionlayer',       this.onUnSelectionLayer);
    GUI.on('activefiltertokenlayer', this.onActiveToken);
    GUI.on('treenodevisible',        this.onTreeNodeVisible);
    GUI.on('treenodeselected',       this.onTreeNodeSelected);
  },

  async mounted() {
    await this.$nextTick();
    // in case of dynamic legend
    if (ApplicationState.project.state.context_base_legend) {
      GUI.on('change-map-legend-params', () => { GUI.getLegendSrc(); });
    }
    if ('legend' === ApplicationState.project.state.catalog_tab) {
      GUI.showLegendPanel();
    }
  },

};
</script>