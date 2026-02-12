<!--
  @file
  @since v3.7
-->

<template>
  <div class = "catalog">

    <!-- TOOLBAR -->
    <div
      id    = "g3w-catalog-toc-layers-toolbar"
      style = "margin: 2px;"
    >
      <catalog-change-map-themes
        :key              = "project.state.gid"
        :map_themes       = "project.state.map_themes"
        :layerstrees      = "state.layerstrees"
        @change-map-theme = "changeMapTheme"
      />
    </div>

    <!-- TAB MENU (content) -->
    <div class = "tab-content">

      <bar-loader :loading = "loading" />

      <div
        id     = "layers"
        class  = "tab-pane active"
      >

        <!-- LAYER TREES -->
        <ul
          v-for = "root in state.layerstrees"
          :key  = "root.storeid"
          class = "tree-root root project-root"
        >
          <catalog-tristate-tree
            v-for                      = "tree in root.tree"
            :key                       = "tree.id"
            :layerstree                = "tree"
            class                      = "item"
            :parentFolder              = "false"
            :root                      = "true"
            :legendplace               = "legend_position"
            :parent_mutually_exclusive = "false"
            :storeid                   = "root.storeid"
          />
        </ul>

        <!-- EXTERNAL LAYERS -->
        <ul v-if = "state.external.wms.length || state.external.tms.length || state.external.vector.length" class = "g3w-external_layers-group">
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
          <catalog-tristate-tree
            v-show          = "!externalayers.collapsed"
            v-for           = "wms in state.external.wms"
            :key            = "wms.id"
            :externallayers = "state.external.wms"
            :layerstree     = "wms"
            @layerchecked   = "updateExternalLayersChecked"
            class           = "item"
          />
          <!-- @since 4.1.0 add tms layers -->
          <catalog-tristate-tree
            v-show          = "!externalayers.collapsed"
            v-for           = "tms in state.external.tms"
            :key            = "tms.id"
            :externallayers = "state.external.tms"
            :layerstree     = "tms"
            @layerchecked   = "updateExternalLayersChecked"
            class           = "item"
          />
          <catalog-tristate-tree
            v-show          = "!externalayers.collapsed"
            v-for           = "vector in state.external.vector"
            :key            = "vector.id"
            :externallayers = "state.external.vector"
            @layerchecked   = "updateExternalLayersChecked"
            :layerstree     = "vector"
            class           = "item"
          />
        </ul>

      </div>

    </div>

    <div
      v-if = "hasRelatedMaps"
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
        v-if           = "hasRelatedMaps && !iframe"
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

import CatalogChangeMapThemes  from 'components/CatalogChangeMapThemes.vue';
import CatalogTristateTree     from 'components/CatalogTristateTree.vue';

export default {

  /** @since 3.8.6 */
  name: 'catalog',

  data() {
    return {
      state:            this.$options.service.state || {},
      legend_position:  ApplicationState.project.state.legend_position || 'tab',
      iframe:           ApplicationState.iframe,
      loading:          false,
      //@since 4.1.0
      externalayers:    {
        checked:   false,
        collapsed: false,
      },
    }
  },

  components: {
    CatalogChangeMapThemes,
    CatalogTristateTree,
  },

  computed: {

    project() {
      return ApplicationState.project;
    },

    title() {
      return this.project.state.name;
    },

    hasLayers() {
      return (
        (this.state.external?.vector || []).length > 0 //has vector external layers
        || (this.state.external?.wms || []).length > 0 //has wms external layers
        || this.state.layerstrees.reduce(( a , l ) => l.tree.length + a, 0) > 0
      );
    },

    /**
     * @returns {boolean} whether it should list any related projects or maps.
     *
     * @since 3.8.0
     */
     hasRelatedMaps() {
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
        ...(this.state.external?.vector || []),
        ...(this.state.external?.wms || []),
        ...(this.state.external?.tms || []),
      ].forEach(l => l.checked = this.externalayers.checked);
    },

    /**
     * @since 4.1.0 Remove external layers
     */
    removeExternalLayers() {
      [
        ...(this.state.external?.vector || []),
        ...(this.state.external?.wms || []),
        ...(this.state.external?.tms || []),
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
      this.state.layerstrees[0].checked = true;

      const changes = (await this.setLayersTreePropertiesFromMapTheme({
        map_theme,
        rootNode:   this.state.layerstrees[0],
        layerstree: this.state.layerstrees[0].tree[0].nodes
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
     * @fires MapService~cataloglayervisible
     *
     * @since 3.10.0
     */
    onTreeNodeVisible(layer) {
      GUI.emit('cataloglayervisible', layer);
    },

    /**
     * Handle legend item select (single mouse click ?)
     *
     * @fires MapService~cataloglayerselected
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
        ...(this.$options.service.state.external?.vector || []),
        ...(this.$options.service.state.external?.wms || []),
      ].every(l => l.checked)
    },

  },

  watch: {

    'state.external.vector': {
      immediante: true,
      handler() {
        this.updateExternalLayersChecked();
      },
    },

    'state.external.wms': {
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

<style>
  .catalog .tree-item.selected                                                   { background-color: var(--skin-color); }
  .catalog .nav-tabs ul li                                                       { color: #fff; }
  .catalog > .nav-tabs                                                           { border: none; margin: 0px; display: flex; flex: 1 1 0; }
  .catalog > .nav-tabs:has(> li:only-child)                                      { display: none; }
  .catalog > .nav-tabs > li                                                      { margin-right: 2px; border-bottom: 4px solid hsl(from var(--bgcolor) h s calc(l - 2)); font-size: 1em; white-space: initial; display: flex; flex: 1 1 0; align-items: stretch; }
  .catalog > .nav-tabs > li > a                                                  { border: 0; margin-right: 0; color: #fff; }
  .catalog > .nav-tabs > li > a > i                                              { color: #a6a6a6; }
  .catalog > .nav-tabs > li:is(.open, :hover) > a                                { border: 0; background: none !important; }
  .catalog > .nav-tabs > li:is(.open, :hover) > a > i                            { color: #a6a6a6; }
  .catalog > .nav-tabs > li:is(.open, :hover) .dropdown-menu                     { margin-top: 0; }
  .catalog > .nav-tabs > li.active                                               { border-bottom: 4px solid var(--skin-color); position: relative; font-weight: bold; }
  .catalog > .nav-tabs > li.active > a                                           { border: 0; color: #fff; background-color: hsl(from var(--bgcolor) h s calc(l + 4)); }
  .catalog > .nav-tabs > li.active > a > i                                       { color: #fff; }
  .catalog > .nav-tabs > li a                                                    { padding: 10px 0; text-align: center; height: 100%; width: 100%; }
  .catalog > .tab-content                                                        { margin-top: -3px; border: 0; color: #fff; padding: 5px 0 0 0; }
  .nav-tabs > li.active > a,
  .nav-tabs > li.active > a:is(:focus, :hover)                                   { color: #fff; }
  .catalog > .title                                                              { padding: 10px; font-weight: bold; }
  .catalog ul                                                                    { line-height: 1.75em; list-style-type: none; }
  .catalog .tree-item.selected ul.layer-categories                               { background-color: var(--bgcolor); }
  .catalog .tree-item div.tree-node-title                                        { padding-left: 3px; cursor: pointer; width: 80%; display: inline-flex; justify-content: space-between; user-select: none; }
  .catalog .tree-item div.tree-node-title.disabled                               { color: #999; }
  .catalog button[type="button"]                                                 { border: unset; background-color: unset; box-shadow: rgba(0,0,0,0.3) 0 2px 5px; padding: 5px; border-radius: 3px; margin: 0 3px; font-weight: bold; color: #fff !important; }
  .catalog button[type="button"].active                                          { box-shadow: none; background-color: #384247; }
  .catalog .tree-item                                                            { cursor: pointer; margin-bottom: 3px; }
  .catalog .tree-item.disabled > span                                            { color: #999; }
  .catalog .root                                                                 { padding: 2px 1px 1px 5px; }
  .catalog .root .tree-item.group                                                { padding-left: 1px; }
  .catalog .root.fa-chevron-right                                                { padding-right: 5px; padding-left: 0; }
  .bold                                                                          { font-weight: bold; color: #fff; }
  .highlightlayer                                                                { border-bottom: 2px dashed; border-color: #ffb516; }
  .catalog                                                                       { padding: 3px; }
  .catalog .tree-root                                                            { padding-left: 0; }
  .catalog .tree-root li > .root                                                 { padding-left: 5px; }
  .catalog .tree-root li.tree-item ul.tree-content-items.root                    { padding-left: 18px; }
  .catalog .tree-root li.tree-item ul.tree-content-items.root > .tree-item.group { padding-left: 1px !important; }
  .catalog .tree-root li.tree-item ul.tree-content-items                         { padding-left: 17px; padding-top: 2px; }
  .g3w-lendplace-toc                                                             { padding-left: 23px; }
  .g3w-lendplace-toc.group                                                       { padding-left: 17px; }
  .g3w-lendplace-toc.root                                                        { padding-left: 18px; }
  .g3w-lendplace-toc.root > li.itemmarginbottom                                  { margin-left: -13px; }
  .g3w-lendplace-toc.root > li.itemmarginbottom div.layer-legend                 { padding-left: 56px; }
  .g3w-lendplace-toc.root > li.itemmarginbottom > span.child                     { padding-left: 18px !important; }
  .catalog .tree-root span.root.collapse-expande-collapse-icon                   { width: 19px; }
  .catalog .tree-root span.root.collapse-expande-collapse-icon.project-root      { width: 17px; }
  .catalog .tree-root span.collapse-expande-collapse-icon                        { width: 10px; }
  .catalog .child-categories                                                     { padding: 5px 3px 1px 12px; }
  .catalog .layer-legend                                                         { padding: 3px 0 0 35px; background-color: var(--bgcolor); }
  .catalog .tree                                                                 { color: #fff; }
  .catalog .tree.disabled                                                        { color: #999; cursor: not-allowed; }
  #catalog #layers ul.g3w-external_layers-group                                  { padding-left: 0 !important; background: var(--bgcolor); border-top: 2px solid var(--skin-color); padding-top: 12px; }
  #catalog #layers ul.g3w-external_layers-group li                               { padding-left: 2px !important; }
  #catalog #layers .sidebar-menu > li > a                                        { border: 0; }
  #catalog > a                                                                   { display: none !important; }
  #catalog .tree-item > .toggle-context-menu                                     { opacity: 0; position: absolute; inset: 0 4px auto auto; padding: 4px 8px; border: 1px solid; border-radius: 3px; }
  #catalog .tree-item > .toggle-context-menu.root                                { opacity: 1; border: none; }
  #catalog .tree-item:not(.group):hover > .toggle-context-menu                   { opacity: 1; }
</style>