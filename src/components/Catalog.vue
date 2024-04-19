<!--
  @file
  @since v3.7
-->

<template>
  <!-- item template -->
  <div id="catalog" @contextmenu.prevent.stop="" class="tabbable-panel catalog">

    <div class="tabbable-line">

      <!-- TAB MENU (header) -->
      <ul
        class="nav nav-tabs catalalog-nav-tabs"
        role="tablist"
        @click.capture="onTabClick"
      >
        <!-- TAB TOC LAYERS -->
        <li
          v-if="hasLayers"
          role="presentation"
          :class="{ active: ('layers' === activeTab) }"
        >
          <a
            href="#layers"
            aria-controls="layers"
            role="tab"
            data-toggle="tab"
            data-i18n="tree"
            v-t="'data'">
          </a>
        </li>
        <!-- TAB EXTERNAL WMS LAYERS -->
        <li
          v-if="state.external.wms.length"
          role="presentation"
          :class="{ active: ('externalwms' === activeTab) }"
        >
          <a
            href="#externalwms"
            aria-controls="externalwms"
            role="tab"
            data-toggle="tab"
            data-i18n="externalwms"
            v-t="'externalwms'">
          </a>
        </li>
        <!-- TAB BASE LAYERS -->
        <li
          v-if="hasBaseLayers"
          role="presentation"
          :class="{ active: ('baselayers' === activeTab) }"
        >
          <a
            href="#baselayers"
            aria-controls="baselayers"
            role="tab"
            data-toggle="tab"
            data-i18n="baselayers"
            v-t="'baselayers'">
          </a>
        </li>
        <!-- TAB LEGEND LAYERS -->
        <li
          v-if="'tab' === state.legend.place && showlegend"
          role="presentation"
          :class="{ active: ('legend' === activeTab) }"
        >
          <a
            href="#legend"
            aria-controls="legend"
            role="tab"
            data-toggle="tab"
            data-i18n="legend"
            v-t="'legend'">
          </a>
        </li>
      </ul>

      <!-- TAB MENU (content) -->
      <div class="tab-content catalog-tab-content">

        <bar-loader :loading="loading" />

        <div
          id     = "layers"
          role   = "tabpanel"
          class  = "tab-pane"
          :class = "{ active: ('layers' === activeTab) }"
        >

          <helpdiv message="catalog_items.helptext" />

          <!-- TOOLBAR -->
          <div
            v-if="showTocTools"
            id="g3w-catalog-toc-layers-toolbar"
            style="margin: 2px;"
          >
            <catalog-change-map-themes
              :key              = "project.state.gid"
              :map_themes       = "project.state.map_themes"
              @change-map-theme = "changeMapTheme"
            />
          </div>

          <!-- LAYER TREES -->
          <ul
            v-for = "root in state.layerstrees"
            :key  = "root.storeid"
            class = "tree-root root project-root"
          >
            <catalog-tristate-tree
              v-for                      = "tree in root.tree"
              :key                       = "tree.id"
              :highlightlayers           = "state.highlightlayers"
              :layerstree                = "tree"
              class                      = "item"
              :parentFolder              = "false"
              :root                      = "true"
              :legendplace               = "state.legend.place"
              :parent_mutually_exclusive = "false"
              :storeid                   = "root.storeid"
            />
          </ul>

          <!-- EXTERNAL VECTOR LAYER -->
          <ul
            v-if="state.external.vector.length"
            class="g3w-external_layers-group"
          >
            <catalog-tristate-tree
              v-for           = "vector in state.external.vector"
              :key            = "vector.id"
              :externallayers = "state.external.vector"
              :layerstree     = "vector"
              class           = "item"
            />
          </ul>

          <!-- GROUP OF LAYERS -->
          <!-- ORIGINAL SOURCE: src/components/CatalogLayersGroup.vue@v3.9.3 -->
          <ul
            v-for="group in state.layersgroups"
            class="g3w-catalog-layers-group"
          >
            <div>
              <h4>{{ group.title }}</h4>
              <catalog-tristate-tree
                v-for       = "node in group.nodes"
                :layerstree = "node"
                class       = "item"
              />
            </div>
          </ul>

        </div>

        <!-- EXTERNAL WMS LAYER -->
        <div
          v-if   = "state.external.wms.length"
          id     = "externalwms"
          role   = "tabpanel"
          class  = "tab-pane"
          :class = "{ active: ('externalwms' === activeTab) }"
        >
          <ul class="g3w-external_wms_layers-group">
            <catalog-tristate-tree
              v-for           = "wms in state.external.wms"
              :key            = "wms.id"
              :externallayers = "state.external.wms"
              :layerstree     = "wms"
              class           = "item"
            />
          </ul>
        </div>

        <!-- BASE LAYERS -->
        <div
          v-if   = "hasBaseLayers"
          id     = "baselayers"
          role   = "tabpanel"
          class  = "tab-pane baselayers"
          :class = "{ active: ('baselayers' === activeTab || !hasLayers) }"
        >
          <ul
            id     = "baselayers-content"
            :class = "{'mobile': isMobile()}"
            :style = "{ gridTemplateColumns: `repeat(auto-fill, minmax(${baselayers.length > 4 ? 80 : 120}px, 1fr))` }"
          >
            <li
              v-if  = "!base.fixed"
              v-for = "base in baselayers"
              :key  = "base.title"
            >
              <img
                :src        = "getSrcBaseLayerImage(base)"
                @click.stop = "setBaseLayer(base.id)"
                class       = "img-responsive img-thumbnail baselayer"
                :style      = "{ opacity: currentBaseLayer === base.id ? 1 : 0.5 }"
              >
              <div class="baseselayer-text text-center g3w-long-text">{{ base.title }}</div>
            </li>
            <li @click.stop="setBaseLayer(null)">
              <img
                :src   = "getSrcBaseLayerImage(null)"
                class  = "img-responsive img-thumbnail baselayer"
                :style = "{ opacity: currentBaseLayer === null ? 1 : 0.5 }"
              >
              <div
                class="baseselayer-text text-center g3w-long-text"
                v-t="'nobaselayer'">
              </div>
            </li>
          </ul>
        </div>

        <!-- ORIGINAL SOURCE: src/components/CatalogLayersLegendItems.vue@v3.9.3 -->
        <!-- ORIGINAL SOURCE: src/components/CatalogLayersLegend.vue@v3.9.3 -->
        <div
          v-if   = "'tab' === state.legend.place"
          v-for  = "tree in state.layerstrees"
          :key   = "tree.id"
          role   = "tabpanel"
          id     = "legend"
          class  = "tab-pane"
          :class = "{ active: 'legend' === activeTab }"
        >
          <div v-for="t in tree.tree" class="legend-item"> <!-- TODO: check if such nesting level really necessary.. -->
            <figure v-for="url in t.legendurls">
              <bar-loader :loading="url.loading" />
              <img
                v-show = "!url.loading && !url.error"
                :src   = "url.url"
                @error = "onLegendError(url)"
                @load  = "onLegendLoad(url)"
              />
              <divider/>
            </figure>
          </div>
        </div>

      </div>

    </div>

    <catalog-layer-context-menu :external="state.external" />

    <catalog-project-context-menu />

  </div>
</template>

<script>

import { CatalogEventBus as VM }   from 'app/eventbus';
import CatalogLayersStoresRegistry from 'store/catalog-layers';
import ProjectsRegistry            from 'store/projects';
import ControlsRegistry            from 'store/map-controls';
import ApplicationService          from 'services/application';
import GUI                         from 'services/gui';

import CatalogChangeMapThemes      from 'components/CatalogChangeMapThemes.vue';
import CatalogLayerContextMenu     from 'components/CatalogLayerContextMenu.vue';
import CatalogProjectContextMenu   from 'components/CatalogProjectContextMenu.vue';
import CatalogTristateTree         from 'components/CatalogTristateTree.vue';

/**
 * Stringify a query URL param (eg. `&WIDTH=700`)
 *
 * @param name
 * @param value
 *
 * @returns { string | null } a string if value is set or null
 */
 function __(name, value) {
  return (value || 0 === value) ? `${name}${value}` : null;
}

export default {

  /** @since 3.8.6 */
  name: 'catalog',

  data() {
    return {
      state:            this.$options.service.state || {},
      showlegend:       false,
      currentBaseLayer: null,
      activeTab:        'layers',
      loading:          false,
    }
  },

  components: {
    CatalogChangeMapThemes,
    CatalogLayerContextMenu,
    CatalogProjectContextMenu,
    CatalogTristateTree,
  },

  computed: {

    /**
     * @returns {boolean} whether to show group toolbar
     */
    showTocTools() {
      return (this.project.state.map_themes || []).length > 1;
    },

    project() {
      return ProjectsRegistry.state.currentProject
    },

    title() {
      return this.project.state.name;
    },

    baselayers() {
      return this.project.state.baselayers;
    },

    hasBaseLayers() {
      return this.project.state.baselayers.length > 0;
    },

    hasLayers() {
      let len = 0;
      this.state.layerstrees.forEach(layerstree => len += layerstree.tree.length);
      return this.state.external.vector.length > 0 || len > 0 || this.state.layersgroups.length > 0 ;
    },

  },

  methods: {

    onLegendError(legendurl) {
      legendurl.error = true;
      legendurl.loading = false;
    },

    onLegendLoad(legendurl) {
      legendurl.loading = false;
    },

    /**
     * Get legend src for visible layers
     *
     * @returns {Promise<void>}
     */
    getLegendSrc(change = false) {
      // skip if not active
      if ('tab' !== this.state.legend.place) {
        return;
      }

      this.state.layerstrees.forEach(t => {
        let layers = this._traverseVisibleLayers(t.tree);
        this.showlegend = this.showlegend || layers.length > 0;
        t.tree.forEach(async tree => {
          try {
            if (
              change && (
                (tree.legendurls && 0 === tree.legendurls.length) ||
                layers.some(l => l.legend.change) ||
                ProjectsRegistry.getCurrentProject().getContextBaseLegend()
              )
            ) {
              layers.filter(l => l.legend.change).forEach(l => l.legend.change = false);
            }
            tree.legendurls = await this._getLegendSrc(layers);
          } catch (e) {
            console.warn(e);
          }
        });
      });
    },

    _traverseVisibleLayers(obj, _layers = []) {
      for (const layer of obj) {
        if (null !== layer.id && undefined !== layer.id && layer.visible && layer.geolayer && !layer.exclude_from_legend) {
          _layers.push(layer);
        }
        if (null !== layer.nodes && undefined !== layer.nodes) {
          _layers = _layers.concat(this._traverseVisibleLayers(layer.nodes, _layers));
        }
      }
      return _layers;
    },

    /**
     * Get legend src for visible layers
     *
     * @returns {Promise<void>}
     */
    async _getLegendSrc(visiblelayers) {

      // reset layers url
      const legendurls = [];

      // filter geolayer
      const layers = visiblelayers.filter(l => l.geolayer);

      const http = { GET: {}, POST: {} };

      layers.forEach(layer => {
        const name         = http[(layer.source && layer.source.url) || layer.external ? 'GET' : layer.ows_method];
        const catalogLayer = CatalogLayersStoresRegistry.getLayerById(layer.id);

        const url          = catalogLayer ? catalogLayer.getLegendUrl(this.state.legend.config, {
          all:        !ProjectsRegistry.getCurrentProject().getContextBaseLegend(), // true = dynamic legend
          format:     'image/png',
          categories: layer.categories
        }) : undefined;


        // no url is set
        if (undefined === catalogLayer) {
          return;
        }

        if (layer.source && layer.source.url) {
          name[url] = [];
          return
        }

        // extract LEGEND_ON and LEGEND_OFF from prefix -> (in case of legend categories)
        let prefix = url.split('LAYER=')[0].split('LEGEND_ON=')[0].split('LEGEND_OFF=')[0];

        if (!name[prefix]) {
          name[prefix] = [];
        }

        name[prefix].unshift({
          layerName:  url.split('LAYER=')[1],
          style:      (Array.isArray(layer.styles) && layer.styles.find(style => style.current) || ({ name: false })).name,
          legend_on:  (url.split('LAYER=')[0].split('LEGEND_ON=')[1] || '').replace('&', ''),                         // remove eventually &
          legend_off: (url.split('LAYER=')[0].split('LEGEND_ON=')[0].split('LEGEND_OFF=')[1] || '').replace('&', ''), // remove eventually &
        });
      });

      for (const method in http) {
        for (const url in http[method]) {
          const obj = {
            loading: true,
            url: null,
            error: false
          };

          legendurls.push(obj);

          const params = {
            LAYERS:[],
            STYLES:[],
            LEGEND_ON:[],
            LEGEND_OFF:[]
          };

          (http[method][url] || []).reduce((_, layer) => {
              params.LAYERS.push(layer.layerName);
              params.STYLES.push(layer.style);
              if (layer.legend_on)  { params.LEGEND_ON.push(layer.legend_on); }
              if (layer.legend_off) { params.LEGEND_OFF.push(layer.legend_off); }
              return params;
            }, params);

          let url_params = [
            __('LAYERS=',     params.LAYERS.join(',')),
            __('STYLES=',     params.STYLES.join(',')),
            __('LEGEND_ON=',  params.LEGEND_ON.join(',')),
            __('LEGEND_OFF=', params.LEGEND_OFF.join(',')),
            __('filtertoken=', ApplicationService.getFilterToken()),
          ]
          .filter(p => p) // discard nullish parameters (without a value)
          .join('&');

          try {
            obj.url = 'GET' === method
              ? url + (http[method][url].length ? url_params : '')
              : URL.createObjectURL(await (await fetch(url.split('?')[0], {
                  method:  'POST',
                  headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
                  // send encoded params
                  body: // new URLSearchParams(url.split('?')[1])
                    url
                      .split('?')[1]
                      .split('&')
                      .filter(p => p.split('=')[0]).map(p => `${p.split('=')[0]}=${encodeURIComponent(p.split('=')[1])}`)
                      .join('&')
                      + '&' + url_params
                })).blob());
          } catch (e) {
            console.warn(e);
          }

          obj.loading = false;
        }
      }

    return legendurls;
    },

    /**
     * Change view
     *
     * @fires CatalogEventBus~layer-change-style
     */
    async changeMapTheme(map_theme) {
      GUI.closeContent();

      // change map theme
      ApplicationService.changeProjectView(true);
      this.state.layerstrees[0].checked = true;
      const changes = (await ProjectsRegistry.getCurrentProject().setLayersTreePropertiesFromMapTheme({
        map_theme,
        rootNode:   this.state.layerstrees[0],
        layerstree: this.state.layerstrees[0].tree[0].nodes
      })).layers;
      ApplicationService.changeProjectView(false);

      // get all layers with styles
      const layers  = Object.keys(changes).filter(id => changes[id].style);
      const styles  = (await this.project.getMapThemeFromThemeName(map_theme)).styles;

      // clear categories
      layers.forEach(id => {
        if (!changes[id].visible) {
          const layer = CatalogLayersStoresRegistry.getLayerById(id);
          layer.clearCategories();
          layer.change();
        }
      });

      // apply styles on each layer
      layers.forEach(id => VM.$emit('layer-change-style', { layerId: id, style: styles[id] }));

    },

    onTabClick(e) {
      if (e.target.attributes['aria-controls']) {
        this.activeTab = e.target.attributes['aria-controls'].value;
      }
    },

    setBaseLayer(id) {
      this.currentBaseLayer = id;
      this.project.setBaseLayer(id);
      ApplicationService.setBaseLayerId(id);
    },

    getSrcBaseLayerImage(baseLayer) {
      let image = 'nobaselayer.png';
      switch (baseLayer && baseLayer.servertype || baseLayer) {
        case 'OSM':  image = 'osm.png';                                    break;
        case 'Bing': image = `bing${baseLayer.source.subtype}.png`;        break;
        case 'TMS':  image = baseLayer.icon ? baseLayer.icon : undefined;  break;
        case 'WMTS': image = baseLayer.icon ? baseLayer.icon : undefined;  break;
      }
      return (baseLayer || {}).icon ? image : `${GUI.getResourcesUrl()}images/${image}`;
    },

    /**
     * @TODO add description
     *
     * @since 3.10.0
     */
    onUnSelectionLayer(storeid, layerstree) {
      GUI.getService('queryresults').removeFromSelection(layerstree, storeid);
    },

    /**
     * @TODO add description
     *
     * @since 3.10.0
     */
    async onActiveFilterTokenLayer(storeid, layerstree) {
      layerstree.filter.active = await CatalogLayersStoresRegistry.getLayersStore(storeid).getLayerById(layerstree.id).toggleFilterToken();
    },

    /**
     * Handle visibilty change on legend item
     *
     * @fires MapService~cataloglayervisible
     *
     * @since 3.10.0
     */
    onTreeNodeVisible(layer) {
      GUI.getService('map').emit('cataloglayervisible', layer);
    },

    /**
     * Handle legend item select (single mouse click ?)
     *
     * @fires MapService~cataloglayerselected
     *
     * @since 3.10.0
     */
    onTreeNodeSelected(storeid, node) {
      let layer = CatalogLayersStoresRegistry.getLayersStore(storeid).getLayerById(node.id);
      // emit signal of select layer from catalog
      if (!layer.isSelected()) {
        GUI.getService('catalog').setSelectedExternalLayer({ layer: null, type: 'vector', selected: false });
      }
      setTimeout(() => {
        CatalogLayersStoresRegistry.getLayersStore(storeid).selectLayer(node.id, !layer.isSelected());
        // emit signal of select layer from catalog
        GUI.getService('map').emit('cataloglayerselected', layer);
      });
    },

    /**
     * Handle temporary external layer add
     *
     * @since 3.10.0
     */
    onTreeNodeExternalSelected(layer) {
      GUI
        .getService('catalog')
        .setSelectedExternalLayer({ layer, type: 'vector', selected: !layer.selected})
        // Loop all layersstores and unselect them all (`selected = false`)
        .then(() => {
          if (layer.selected) {
            CatalogLayersStoresRegistry.getLayersStores().forEach(layer => { layer.selectLayer(null, false); });
          }
        });
    },

    /**
     * @TODO add description
     *
     * @listens ol.interaction~propertychange
     *
     * @since 3.10.0
     */
    onRegisterControl(id, control) {
      if ('querybbox' === id) {
        control.getInteraction().on('propertychange', e => {
          if ('active' === e.key) {
            this.state.highlightlayers = !e.oldValue;
          }
        })
      }
    },

  },

  watch: {

    /**
     * Listen external wms change. If remove all layer need to set active the project or default tab
     */
    'state.external.wms'(newlayers, oldlayers) {
      if (oldlayers && 0 === newlayers.length) {
        this.activeTab = this.project.state.catalog_tab || 'layers';
      }
    },

    project: {
      async handler(project, oldproject) {
        const activeTab = project.state.catalog_tab || 'layers';
        this.loading = 'baselayers' === activeTab;
        await this.$nextTick();
        setTimeout(() => {
          this.loading = false;
          this.activeTab = activeTab;
        }, ('baselayers' === activeTab) ? 500 : 0)
      },
      immediate: false
    },

    activeTab(tab) {
      if ('legend' === tab) {
        this.getLegendSrc(true);
      }
    },

  },

  /**
   * @listens CatalogEventBus~unselectionlayer
   * @listens CatalogEventBus~activefiltertokenlayer
   * @listens CatalogEventBus~treenodevisible
   * @listens CatalogEventBus~treenodeselected
   * @listens CatalogEventBus~treenodeexternalselected
   * @listens ControlsRegistry~registerControl
   */
  created() {
    VM.$on('unselectionlayer',                  this.onUnSelectionLayer);
    VM.$on('activefiltertokenlayer',            this.onActiveFilterTokenLayer);
    VM.$on('treenodevisible',                   this.onTreeNodeVisible);
    VM.$on('treenodeselected',                  this.onTreeNodeSelected);
    VM.$on('treenodeexternalselected',          this.onTreeNodeExternalSelected);
    VM.$on('layer-change-style',                this.getLegendSrc);
    ControlsRegistry.onafter('registerControl', this.onRegisterControl);
  },

  beforeMount() {
    this.currentBaseLayer = this.project.state.initbaselayer;
  },

  async mounted() {
    await this.$nextTick();
    // in case of dynamic legend
    if (ProjectsRegistry.getCurrentProject().getContextBaseLegend()) {
      GUI.getService('map').on('change-map-legend-params', () => { this.getLegendSrc(); });
    } else {
      this.getLegendSrc();
    }
  },

};
</script>

<style scoped>
.g3w-catalog-layers-group > div {
  border: 1px solid #ffffff33;
  margin: 5px;
}
.g3w-catalog-layers-group > div > h4 {
  margin: 5px;
  font-weight: bold;
}
</style>