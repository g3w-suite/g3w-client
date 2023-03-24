<!--
  @file
  @since v3.7
-->

<template>
  <!-- item template -->
  <div id="catalog" @contextmenu.prevent.stop="" class="tabbable-panel catalog">
    <div class="tabbable-line">
      <ul class="nav nav-tabs catalalog-nav-tabs" role="tablist" @click.capture="delegationClickEventTab">
        <li v-if="hasLayers" role="presentation"  :class="{ active: activeTab === 'layers' && 'hasLayers' }">
          <a href="#layers" aria-controls="layers" role="tab" data-toggle="tab" data-i18n="tree" v-t="'data'"></a>
        </li>
        <li v-if="state.external.wms.length" role="presentation"  :class="{ active: activeTab === 'externalwms' }">
          <a href="#externalwms" aria-controls="externalwms" role="tab" data-toggle="tab" data-i18n="externalwms" v-t="'externalwms'"></a>
        </li>
        <li v-if="hasBaseLayers" role="presentation" :class="{ active: activeTab === 'baselayers' }" >
          <a href="#baselayers" aria-controls="baselayers" role="tab" data-toggle="tab" data-i18n="baselayers" v-t="'baselayers'"></a>
        </li>
        <li v-if="legend.place ===  'tab' && showlegend" role="presentation" :class="{ active: activeTab === 'legend' }">
          <a href="#legend" aria-controls="legend" role="tab" data-toggle="tab" data-i18n="legend" v-t="'legend'"></a>
        </li>
      </ul>
      <div class="tab-content catalog-tab-content">
        <bar-loader :loading="loading"></bar-loader>
        <div role="tabpanel" class="tab-pane" :class="{ active: activeTab === 'layers' && 'hasLayers' }" id="layers">
          <helpdiv message="catalog_items.helptext"></helpdiv>
          <div v-if="showTocTools" id="g3w-catalog-toc-layers-toolbar" style="margin: 2px;">
            <change-map-themes-component
              :key="project.state.gid"
              :map_themes="project.state.map_themes"
              @change-map-theme="changeMapTheme"/>
          </div>
          <ul class="tree-root root project-root" v-for="_layerstree in state.layerstrees" :key="_layerstree.storeid">
            <tristate-tree
              :highlightlayers="state.highlightlayers"
              :layerstree="layerstree"
              class="item"
              :parentFolder="false"
              :root="true"
              :legendplace="legend.place"
              :parent_mutually_exclusive="false"
              v-for="layerstree in _layerstree.tree"
              :storeid="_layerstree.storeid"
              :key="layerstree.id">
            </tristate-tree>
          </ul>
          <ul class="g3w-external_layers-group" v-if="state.external.vector.length">
            <tristate-tree :externallayers="state.external.vector" :layerstree="layerstree" class="item" v-for="layerstree in state.external.vector" :key="layerstree.id">
            </tristate-tree>
          </ul>
          <ul v-for="layersgroup in state.layersgroups">
            <layers-group :layersgroup="layersgroup"></layers-group>
          </ul>
        </div>
        <div role="tabpanel" class="tab-pane" v-if="state.external.wms.length" :class="{ active: activeTab === 'externalwms' }" id="externalwms">
          <ul class="g3w-external_wms_layers-group">
            <tristate-tree :externallayers="state.external.wms" :layerstree="layerstree" class="item" v-for="layerstree in state.external.wms" :key="layerstree.id">
            </tristate-tree>
          </ul>
        </div>
        <div class="tab-pane baselayers" v-if="hasBaseLayers" role="tabpanel"  :class="{ active: activeTab === 'baselayers' || !hasLayers }" id="baselayers">
          <ul id="baselayers-content" :class="{'mobile': isMobile()}" :style="{gridTemplateColumns: `repeat(auto-fill, minmax(${baselayers.length > 4 ? 80 : 120}px, 1fr))`}">
            <li v-if="!baselayer.fixed" v-for="baselayer in baselayers" :key="baselayer.title">
              <img :src="getSrcBaseLayerImage(baselayer)" @click.stop="setBaseLayer(baselayer.id)" class="img-responsive img-thumbnail baselayer" :style="{opacity: currentBaseLayer === baselayer.id ? 1 : 0.5}" >
              <div class="baseselayer-text text-center">{{ baselayer.title }}</div>
            </li>
            <li @click.stop="setBaseLayer(null)">
              <img :src="getSrcBaseLayerImage(null)" class="img-responsive img-thumbnail baselayer" :style="{opacity: currentBaseLayer === null ? 1 : 0.5}">
              <div class="baseselayer-text text-center" v-t="'nobaselayer'"></div>
            </li>
          </ul>
        </div>
        <layerslegend v-if="legend.place === 'tab'" @showlegend="showLegend" :legend="legend" :active="activeTab === 'legend'"
          v-for="_layerstree in state.layerstrees" :layerstree="_layerstree" :key="_layerstree.id">
        </layerslegend>
      </div>
    </div>
    <catalog-layer-context-menu :external="state.external"/>
    <catalog-project-context-menu/>

  </div>
</template>

<script>
import { MAP_SETTINGS } from 'app/constant';
import CatalogEventHub from 'gui/catalog/vue/catalogeventhub';
import ChangeMapThemesComponent from 'components/CatalogChangeMapThemes.vue';
import CatalogLayerContextMenu from 'components/CatalogLayerContextMenu.vue';
import CatalogProjectContextMenu from 'components/CatalogProjectContextMenu.vue';
import CatalogLayersStoresRegistry from 'store/catalog-layers';
import ApplicationService from 'services/application';
import ControlsRegistry from 'store/map-controls';
import GUI from 'services/gui';

const DEFAULT_ACTIVE_TAB = 'layers';

export default {
  data() {
    const legend = this.$options.legend;
    legend.place = ApplicationService.getCurrentProject().getLegendPosition() || 'tab';
    return {
      state: null,
      legend,
      showlegend: false,
      currentBaseLayer: null,
      activeTab: null,
      loading: false,
    }
  },
  components: {
    ChangeMapThemesComponent,
    CatalogLayerContextMenu,
    CatalogProjectContextMenu,
  },
  computed: {
    //show or not group toolbar
    showTocTools(){
      const {map_themes=[]} = this.project.state;
      const show = map_themes.length > 1;
      return show;
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
    hasBaseLayers(){
      return this.project.state.baselayers.length > 0;
    },
    hasLayers() {
      let layerstresslength = 0;
      this.state.layerstrees.forEach(layerstree => layerstresslength+=layerstree.tree.length);
      return this.state.external.vector.length > 0 || layerstresslength >0 || this.state.layersgroups.length > 0 ;
    }
  },
  methods: {
    //change view method
    async changeMapTheme(map_theme){
      GUI.closeContent();
      const changes = await this.$options.service.changeMapTheme(map_theme);
      const changeStyleLayersId = Object.keys(changes.layers).filter(layerId => {
        if (changes.layers[layerId].style) {
          if (!changes.layers[layerId].visible){
            const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
            // clear categories
            layer.clearCategories();
            layer.change();
          }
          return true
        }
      });
      this.legend.place === 'tab' ? CatalogEventHub.$emit('layer-change-style') :
        // get all layer tha changes style
        changeStyleLayersId.forEach(layerId => {
          CatalogEventHub.$emit('layer-change-style', {
            layerId
          })
        });
    },
    delegationClickEventTab(evt){
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
      const type = baseLayer && baseLayer.servertype || baseLayer;
      let image;
      let customimage = false;
      switch (type) {
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
      return !customimage ? `${GUI.getResourcesUrl()}images/${image}`: image;
    }
  },
  watch: {
    // listen external wms change. If remove all layer nee to set active the project or default tab
    'state.external.wms'(newlayers, oldlayers){
      if (oldlayers && newlayers.length === 0){
        this.activeTab = this.project.state.catalog_tab || DEFAULT_ACTIVE_TAB;
      }
    },
    'state.prstate.currentProject': {
      async handler(project, oldproject){
        const activeTab = project.state.catalog_tab || DEFAULT_ACTIVE_TAB;
        this.loading = activeTab === 'baselayers';
        await this.$nextTick();
        setTimeout(()=>{
          this.loading = false;
          this.activeTab = activeTab;
        }, activeTab === 'baselayers' ? 500 : 0)
      },
      immediate: false
    }
  },
  created() {
    this.layerpositions = MAP_SETTINGS.LAYER_POSITIONS.getPositions();

    /**
     * @TODO add description
     */
    CatalogEventHub.$on('unselectionlayer', (storeid, layerstree) => {
      if (layerstree.external) {
        GUI.getService('queryresults').clearSelectionExtenalLayer(layerstree);
      } else {
        CatalogLayersStoresRegistry.getLayersStore(storeid).getLayerById(layerstree.id).clearSelectionFids();
      }
    });

    /**
     * @TODO add description
     */
    CatalogEventHub.$on('activefiltertokenlayer', async (storeid, layerstree) => {
      layerstree.filter.active = await CatalogLayersStoresRegistry.getLayersStore(storeid).getLayerById(layerstree.id).toggleFilterToken();
    });

    /**
     * Handle visibilty change on legend item
     */
    CatalogEventHub.$on('treenodevisible', layer => {
      GUI.getService('map').emit('cataloglayervisible', layer);
    });

    /**
     * Handle legend item select (single mouse click ?)
     */
    CatalogEventHub.$on('treenodeselected', function (storeid, node) {
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
    CatalogEventHub.$on('treenodeexternalselected', layer => {
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
  beforeMount(){
    this.currentBaseLayer = this.project.state.initbaselayer;
  }
};
</script>