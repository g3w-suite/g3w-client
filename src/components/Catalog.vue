<!--
  @file
  @since v3.7
-->

<template>
  <!-- item template -->
  <div id="catalog" @contextmenu.prevent.stop="" class="tabbable-panel catalog">

    <div class="tabbable-line">

      <ul class="nav nav-tabs catalalog-nav-tabs" role="tablist" @click.capture="delegationClickEventTab">
        <li v-if="hasLayers" role="presentation"  :class="{ active: ('layers' === activeTab && 'hasLayers') }">
          <a href="#layers" aria-controls="layers" role="tab" data-toggle="tab" data-i18n="tree" v-t="'data'"></a>
        </li>
        <li v-if="state.external.wms.length" role="presentation"  :class="{ active: ('externalwms' === activeTab) }">
          <a href="#externalwms" aria-controls="externalwms" role="tab" data-toggle="tab" data-i18n="externalwms" v-t="'externalwms'"></a>
        </li>
        <li v-if="hasBaseLayers" role="presentation" :class="{ active: ('baselayers' === activeTab) }" >
          <a href="#baselayers" aria-controls="baselayers" role="tab" data-toggle="tab" data-i18n="baselayers" v-t="'baselayers'"></a>
        </li>
        <li v-if="showlegend && ('tab' === legend.place)" role="presentation" :class="{ active: ('legend' === activeTab) }">
          <a href="#legend" aria-controls="legend" role="tab" data-toggle="tab" data-i18n="legend" v-t="'legend'"></a>
        </li>
      </ul>

      <div class="tab-content catalog-tab-content">

        <bar-loader :loading="loading" />

        <div role="tabpanel" class="tab-pane" :class="{ active: ('layers' === activeTab && 'hasLayers') }" id="layers">
          <helpdiv message="catalog_items.helptext" />

          <div v-if="showTocTools" id="g3w-catalog-toc-layers-toolbar" style="margin: 2px;">
            <changemapthemes
              :key="project.state.gid"
              :map_themes="project.state.map_themes"
              @change-map-theme="changeMapTheme"
            />
          </div>

          <ul v-for="_layerstree in state.layerstrees" :key="_layerstree.storeid" class="tree-root root project-root">
            <tristate-tree
              v-for="layerstree in _layerstree.tree"
              :highlightlayers="state.highlightlayers"
              :layerstree="layerstree"
              class="item"
              :parentFolder="false"
              :root="true"
              :legendplace="legend.place"
              :parent_mutually_exclusive="false"
              :storeid="_layerstree.storeid"
              :key="layerstree.id"
            />
          </ul>

          <ul v-if="state.external.vector.length" class="g3w-external_layers-group">
            <tristate-tree
              v-for="layerstree in state.external.vector"
              :externallayers="state.external.vector"
              :layerstree="layerstree" class="item"
              :key="layerstree.id"
            />
          </ul>

          <ul v-for="layersgroup in state.layersgroups">
            <layers-group :layersgroup="layersgroup" />
          </ul>

        </div>

        <div v-if="state.external.wms.length" id="externalwms" role="tabpanel" class="tab-pane" :class="{ active: ('externalwms' === activeTab) }">
          <ul class="g3w-external_wms_layers-group">
            <tristate-tree
              v-for="layerstree in state.external.wms"
              :externallayers="state.external.wms"
              :layerstree="layerstree"
              class="item"
              :key="layerstree.id"
            />
          </ul>
        </div>

        <div v-if="hasBaseLayers" class="tab-pane baselayers" id="baselayers" role="tabpanel" :class="{ active: ('baselayers' === activeTab || !hasLayers) }">
          <ul id="baselayers-content" :class="{'mobile': isMobile()}" :style="{gridTemplateColumns: `repeat(auto-fill, minmax(${ baselayers.length > 4 ? 80 : 120 }px, 1fr))`}">
            <li v-if="!baselayer.fixed" v-for="baselayer in baselayers" :key="baselayer.title">
              <img
                :src="getSrcBaseLayerImage(baselayer)"
                @click.stop="setBaseLayer(baselayer.id)"
                class="img-responsive img-thumbnail baselayer"
                :style="{ opacity: (baselayer.id === currentBaseLayer ? 1 : 0.5) }"
              >
              <div class="baseselayer-text text-center">{{ baselayer.title }}</div>
            </li>
            <li @click.stop="setBaseLayer(null)">
              <img
                :src="getSrcBaseLayerImage(null)"
                class="img-responsive img-thumbnail baselayer"
                :style="{opacity: (null === currentBaseLayer ? 1 : 0.5) }"
              >
              <div class="baseselayer-text text-center" v-t="'nobaselayer'"></div>
            </li>
          </ul>
        </div>

        <layerslegend
          v-if="'tab' === legend.place"
          v-for="_layerstree in state.layerstrees"
          @showlegend="showLegend"
          :legend="legend"
          :active="'legend' === activeTab"
          :layerstree="_layerstree"
          :key="_layerstree.id"
        />
      </div>

    </div>

    <cataloglayercontextmenu :external="state.external"/>

</div>
</template>

<script>
import { MAP_SETTINGS } from 'app/constant';
import { CatalogEventBus as VM } from 'app/eventbus';
import ChangeMapThemesComponent from 'components/CatalogChangeMapThemes.vue';
import CatalogLayerContextMenu from 'components/CatalogLayerContextMenu.vue';
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
    'changemapthemes':          ChangeMapThemesComponent,
    'cataloglayercontextmenu':  CatalogLayerContextMenu
  },

  computed: {

    /**
     * Whether to show group toolbar 
     */
    showTocTools() {
      const { map_themes = [] } = this.project.state;
      return map_themes.length > 1;
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
     */
    async changeMapTheme(map_theme) {
      GUI.closeContent();
      const changes = await this.$options.service.changeMapTheme(map_theme);
      const changeStyleLayersId = Object.keys(changes.layers).filter(layerId => {
        if (changes.layers[layerId].style) {
          if (!changes.layers[layerId].visible) {
            const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
            // clear categories
            layer.clearCategories();
            layer.change();
          }
          return true;
        }
      });
      if ('tab' === this.legend.place) {
        VM.$emit('layer-change-style');
      } else {
        // get all layer tha changes style
        changeStyleLayersId.forEach(layerId => { VM.$emit('layer-change-style', { layerId, style: map_theme }); });
      }
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

  created() {
    this.layerpositions = MAP_SETTINGS.LAYER_POSITIONS.getPositions();

    /**
     * @TODO add description
     */
    VM.$on('unselectionlayer', (storeid, layerstree) => {
      GUI.getService('queryresults').removeFromSelection(layerstree, storeid);
    });

    /**
     * @TODO add description
     */
     VM.$on('activefiltertokenlayer', async (storeid, layerstree) => {
      layerstree.filter.active = await CatalogLayersStoresRegistry.getLayersStore(storeid).getLayerById(layerstree.id).toggleFilterToken();
    });

    /**
     * Handle visibilty change on legend item
     */
     VM.$on('treenodevisible', layer => {
      GUI.getService('map').emit('cataloglayervisible', layer);
    });

    /**
     * Handle legend item select (single mouse click ?)
     */
     VM.$on('treenodeselected', function (storeid, node) {
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
    });

    /**
     * Handle temporary external layer add
     */
    VM.$on('treenodeexternalselected', layer => {
      GUI
        .getService('catalog')
        .setSelectedExternalLayer({ layer, type: 'vector', selected: !layer.selected})
        // Loop all layersstores and unselect them all (`selected = false`)
        .then(() => {
          if (layer.selected) {
            CatalogLayersStoresRegistry.getLayersStores().forEach(layer => { layer.selectLayer(null, false); });
          }
        });
    });


    /**
     * @TODO add description
     */
    ControlsRegistry.onafter('registerControl', (id, control) => {
      if ('querybbox' === id) {
        control.getInteraction().on('propertychange', evt => {
          if ('active' === evt.key) this.state.highlightlayers = !evt.oldValue;
        })
      }
    });

  },

  beforeMount() {
    this.currentBaseLayer = this.project.state.initbaselayer;
  },

};
</script>