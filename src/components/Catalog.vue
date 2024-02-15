<!--
  @file
  @since v3.7
-->

<template>
  <!-- item template -->
  <div id="catalog" @contextmenu.prevent.stop="" class="tabbable-panel catalog">

    <div class="tabbable-line">

      <!-- TAB MENU (header) -->
      <ul class="nav nav-tabs catalalog-nav-tabs" role="tablist" @click.capture="delegationClickEventTab">
        <li v-if="hasLayers" role="presentation"  :class="{ active: ('layers' === activeTab) }">
          <a href="#layers" aria-controls="layers" role="tab" data-toggle="tab" data-i18n="tree" v-t="'data'"></a>
        </li>
        <li v-if="state.external.wms.length" role="presentation" :class="{ active: ('externalwms' === activeTab) }">
          <a href="#externalwms" aria-controls="externalwms" role="tab" data-toggle="tab" data-i18n="externalwms" v-t="'externalwms'"></a>
        </li>
        <li v-if="hasBaseLayers" role="presentation" :class="{ active: ('baselayers' === activeTab) }" >
          <a href="#baselayers" aria-controls="baselayers" role="tab" data-toggle="tab" data-i18n="baselayers" v-t="'baselayers'"></a>
        </li>
        <li v-if="'tab' === legend.place && showlegend" role="presentation" :class="{ active: ('legend' === activeTab) }">
          <a href="#legend" aria-controls="legend" role="tab" data-toggle="tab" data-i18n="legend" v-t="'legend'"></a>
        </li>
      </ul>

      <!-- TAB MENU (content) -->
      <div class="tab-content catalog-tab-content">

        <bar-loader :loading="loading" />

        <div id="layers" role="tabpanel" class="tab-pane" :class="{ active: ('layers' === activeTab) }">

          <helpdiv message="catalog_items.helptext" />

          <!-- TOOLBAR -->
          <div v-if="showTocTools" id="g3w-catalog-toc-layers-toolbar" style="margin: 2px;">
            <change-map-themes-component
              :key="project.state.gid"
              :map_themes="project.state.map_themes"
              @change-map-theme="changeMapTheme"
            />
          </div>

          <!-- LAYER TREES -->
          <ul
            v-for="_layerstree in state.layerstrees"
            :key="_layerstree.storeid"
            class="tree-root root project-root"
          >
            <tristate-tree
              v-for="layerstree in _layerstree.tree"
              :key="layerstree.id"
              :highlightlayers="state.highlightlayers"
              :layerstree="layerstree"
              class="item"
              :parentFolder="false"
              :root="true"
              :legendplace="legend.place"
              :parent_mutually_exclusive="false"
              :storeid="_layerstree.storeid"
            />
          </ul>

          <!-- EXTERNAL VECTOR LAYER -->
          <ul v-if="state.external.vector.length" class="g3w-external_layers-group">
            <tristate-tree
              v-for="layerstree in state.external.vector"
              :key="layerstree.id"
              :externallayers="state.external.vector"
              :layerstree="layerstree"
              class="item"
            />
          </ul>

          <!-- GROUP OF LAYERS -->
          <ul v-for="layersgroup in state.layersgroups">
            <layers-group :layersgroup="layersgroup" />
          </ul>

        </div>

        <!-- EXTERNAL WMS LAYER -->
        <div v-if="state.external.wms.length" id="externalwms" role="tabpanel" class="tab-pane" :class="{ active: ('externalwms' === activeTab) }">
          <ul class="g3w-external_wms_layers-group">
            <tristate-tree
              v-for="layerstree in state.external.wms"
              :key="layerstree.id"
              :externallayers="state.external.wms"
              :layerstree="layerstree"
              class="item"
            />
          </ul>
        </div>

        <!-- BASE LAYERS -->
        <div v-if="hasBaseLayers" id="baselayers" role="tabpanel" class="tab-pane baselayers" :class="{ active: ('baselayers' === activeTab || !hasLayers) }">
          <ul
            id="baselayers-content"
            :class="{'mobile': isMobile()}"
            :style="{ gridTemplateColumns: `repeat(auto-fill, minmax(${baselayers.length > 4 ? 80 : 120}px, 1fr))` }"
          >
            <li
              v-if="!baselayer.fixed"
              v-for="baselayer in baselayers"
              :key="baselayer.title"
            >
              <img
                :src="getSrcBaseLayerImage(baselayer)"
                @click.stop="setBaseLayer(baselayer.id)"
                class="img-responsive img-thumbnail baselayer"
                :style="{opacity: currentBaseLayer === baselayer.id ? 1 : 0.5}"
              >
              <div class="baseselayer-text text-center">{{ baselayer.title }}</div>
            </li>
            <li @click.stop="setBaseLayer(null)">
              <img
                :src="getSrcBaseLayerImage(null)"
                class="img-responsive img-thumbnail baselayer"
                :style="{ opacity: currentBaseLayer === null ? 1 : 0.5 }"
              >
              <div class="baseselayer-text text-center" v-t="'nobaselayer'"></div>
            </li>
          </ul>
        </div>

        <!-- TODO: add description -->
        <layerslegend
          v-if="'tab' === legend.place"
          v-for="_layerstree in state.layerstrees"
          :key="_layerstree.id"
          :legend="legend"
          :active="'legend' === activeTab"
          :layerstree="_layerstree"
          @showlegend="showLegend"
        />

      </div>

    </div>

    <catalog-layer-context-menu :external="state.external" />

    <catalog-project-context-menu />

  </div>
</template>

<script>
import { MAP_SETTINGS } from 'app/constant';
import { CatalogEventBus as VM } from 'app/eventbus';
import ChangeMapThemesComponent from 'components/CatalogChangeMapThemes.vue';
import CatalogLayerContextMenu from 'components/CatalogLayerContextMenu.vue';
import CatalogProjectContextMenu from 'components/CatalogProjectContextMenu.vue';
import CatalogLayersStoresRegistry from 'store/catalog-layers';
import ApplicationService from 'services/application';
import ControlsRegistry from 'store/map-controls';
import GUI from 'services/gui';

const DEFAULT_ACTIVE_TAB = 'layers';

export default {

  /** @since 3.8.6 */
  name: 'catalog',

  data() {
    this.$options.legend.place = ApplicationService.getCurrentProject().getLegendPosition() || 'tab';
    return {
      state:            null,
      legend:           this.$options.legend,
      showlegend:       false,
      currentBaseLayer: null,
      activeTab:        null,
      loading:          false,
    }
  },

  components: {
    ChangeMapThemesComponent,
    CatalogLayerContextMenu,
    CatalogProjectContextMenu,
  },

  computed: {

    /**
     * @returns {boolean} whether to show group toolbar
     */
    showTocTools() {
      return (this.project.state.map_themes || []).length > 1;
    },

    project() {
      return this.state.prstate.currentProject
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

    /**
     * Change view
     *
     * @fires CatalogEventBus~layer-change-style
     */
    async changeMapTheme(map_theme) {
      GUI.closeContent();

      // get all layers with styles
      const changes = (await this.$options.service.changeMapTheme(map_theme)).layers;
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

    delegationClickEventTab(evt) {
     this.activeTab = evt.target.attributes['aria-controls'] ? evt.target.attributes['aria-controls'].value : this.activeTab;
    },

    showLegend(bool) {
      this.showlegend = bool;
    },

    setBaseLayer(id) {
      this.currentBaseLayer = id;
      this.project.setBaseLayer(id);
      ApplicationService.setBaseLayerId(id);
    },

    getSrcBaseLayerImage(baseLayer) {
      let image;
      let customimage = false;
      switch (baseLayer && baseLayer.servertype || baseLayer) {
        case 'OSM':
          image = 'osm.png';
          break;
        case 'Bing':
          const subtype = baseLayer.source.subtype;
          image = `bing${subtype}.png`;
          break;
        case 'TMS':
        case 'WMTS':
          if (baseLayer.icon) {
            customimage = true;
            image = baseLayer.icon;
            break;
          }
        default:
          image = 'nobaselayer.png';
      }
      return customimage ? image : `${GUI.getResourcesUrl()}images/${image}`;
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
        control.getInteraction().on('propertychange', evt => {
          if ('active' === evt.key) this.state.highlightlayers = !evt.oldValue;
        })
      }
    },

  },

  watch: {

    /**
     * Listen external wms change. If remove all layer nee to set active the project or default tab
     */
    'state.external.wms'(newlayers, oldlayers) {
      if (oldlayers && 0 === newlayers.length) {
        this.activeTab = this.project.state.catalog_tab || DEFAULT_ACTIVE_TAB;
      }
    },

    'state.prstate.currentProject': {
      async handler(project, oldproject) {
        const activeTab = project.state.catalog_tab || DEFAULT_ACTIVE_TAB;
        this.loading = 'baselayers' === activeTab;
        await this.$nextTick();
        setTimeout(() => {
          this.loading = false;
          this.activeTab = activeTab;
        }, ('baselayers' === activeTab) ? 500 : 0)
      },
      immediate: false
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
    this.layerpositions = MAP_SETTINGS.LAYER_POSITIONS.getPositions();

    VM.$on('unselectionlayer',         this.onUnSelectionLayer);
    VM.$on('activefiltertokenlayer',   this.onActiveFilterTokenLayer);
    VM.$on('treenodevisible',          this.onTreeNodeVisible);
    VM.$on('treenodeselected',         this.onTreeNodeSelected);
    VM.$on('treenodeexternalselected', this.onTreeNodeExternalSelected);
    ControlsRegistry.onafter('registerControl',     this.onRegisterControl);
  },

  beforeMount() {
    this.currentBaseLayer = this.project.state.initbaselayer;
  },

};
</script>