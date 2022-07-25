<!-- ORIGINAL SOURCE: -->
<!-- gui/catalog/vue/catalog.html@v3.4 -->
<!-- gui/catalog/vue/catalog.js@v3.4 -->

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
            <changemapthemes :key="project.state.gid" :map_themes="project.state.map_themes" @change-map-theme="changeMapTheme"></changemapthemes>
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
    <ul id="layer-menu" ref="layer-menu" v-click-outside-layer-menu="closeLayerMenu" tabindex="-1" v-if="layerMenu.show" :style="{top: layerMenu.top + 'px', left: layerMenu.left + 'px' }">
      <li class="title">
        <div>{{ layerMenu.layer.title}}</div>
        <div style="font-weight: normal; font-size: 0.8em">{{getGeometryType(layerMenu.layer.id, layerMenu.layer.external)}}</div>
      </li>
      <li v-if="!layerMenu.layer.projectLayer">
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span class="item-text" v-t="'sdk.catalog.menu.layerposition'" style="margin-right: 30px;"></span>
          <layerspositions @layer-position-change="changeLayerMapPosition({position:$event, layer: layerMenu.layer})" style="display: flex; flex-direction: column; justify-content: space-between" :position="layerMenu.layer.position"></layerspositions>
        </div>
      </li>
      <li v-if="layerMenu.layer.metadata && layerMenu.layer.metadata.abstract" @mouseleave.self="showMetadataInfo(false)"  @mouseover.self="showMetadataInfo(true,  $event)">
        <span class="menu-icon" :class="g3wtemplate.getFontClass('info')"></span>
        <span class="item-text" v-t="'Metadata'"></span>
        <div v-show="layerMenu.metadatainfoMenu.show" style="position:fixed; background-color: #FFFFFF; color:#000000; padding-left: 0; border-radius: 0 3px 3px 0;" :style="{ top: layerMenu.metadatainfoMenu.top + 'px', left: `${layerMenu.metadatainfoMenu.left+1}px` }">
          <div class="layer-menu-metadata-info" style="padding: 5px;" v-html="layerMenu.layer.metadata.abstract"></div>
        </div>
      </li>
      <li v-if="layerMenu.layer.geolayer && layerMenu.layer.styles && layerMenu.layer.styles.length > 1" @mouseleave.self="showStylesMenu(false,$event)" @mouseover.self="showStylesMenu(true,$event)" class="menu-icon">
        <span class="menu-icon" :class="g3wtemplate.getFontClass('palette')"></span>
        <span class="item-text" v-t="'catalog_items.contextmenu.styles'"></span>
        <span class="menu-icon" style="position: absolute; right: 0; margin-top: 3px" :class="g3wtemplate.getFontClass('arrow-right')"></span>
        <ul v-show="layerMenu.stylesMenu.show" style="position:fixed; padding-left: 0; background-color: #FFFFFF; color:#000000" :style="{ top: layerMenu.stylesMenu.top + 'px', left: `${layerMenu.stylesMenu.left}px`}">
          <li v-for="(style, index) in layerMenu.layer.styles" @click.stop="setCurrentLayerStyle(index)" :key="style.name">
            <span v-if="style.current" style="font-size: 0.8em;" :class="g3wtemplate.getFontClass('circle')"></span>
            <span>{{style.name}}
              <span v-if="style.name ===  layerMenu.layer.defaultstyle && layerMenu.layer.styles.length > 1">(<span v-t="'default'"></span>)</span></span>
          </li>
        </ul>
      </li>
      <li v-if="canZoom(layerMenu.layer)" @click.prevent.stop="zoomToLayer">
        <span class="menu-icon" :class="g3wtemplate.getFontClass('search')"></span>
        <span class="item-text" v-t="'catalog_items.contextmenu.zoomtolayer'"></span>
      </li>
      <li v-if="layerMenu.layer.openattributetable" @click.prevent.stop="showAttributeTable(layerMenu.layer.id)">
        <bar-loader :loading="layerMenu.loading.data_table"></bar-loader>
        <span class="menu-icon" :class="g3wtemplate.getFontClass('list')"> </span>
        <span class="item-text" v-t="'catalog_items.contextmenu.open_attribute_table'"></span>
      </li>
      <li @click.prevent.stop="" v-if="!layerMenu.layer.projectLayer && layerMenu.layer._type !== 'wms'" @mouseleave.self="showColorMenu(false,$event)" @mouseover.self="showColorMenu(true,$event)">
        <span class="item-text" v-t="'catalog_items.contextmenu.vector_color_menu'"></span>
        <span class="menu-icon" style="position: absolute; right: 0; margin-top: 3px" :class="g3wtemplate.getFontClass('arrow-right')"></span>
        <ul v-if="layerMenu.colorMenu.show" style="position:fixed" :style="{ top: layerMenu.colorMenu.top + 'px', left: layerMenu.colorMenu.left +   'px' }">
          <li style="padding:0;">
            <chrome-picker
              ref="color_picker"
              @click.prevent.stop=""
              @hook:beforeDestroy="onbeforeDestroyChangeColor"
              v-model="layerMenu.colorMenu.color"
              @change-color="onChangeColor"
              style="width: 100%">
            </chrome-picker>
          </li>
        </ul>
      </li>
      <li @click.prevent.stop="" v-if="!layerMenu.layer.projectLayer && layerMenu.layer._type !== 'wms'" v-download>
        <div @click.prevent.stop="downloadExternalShapefile(layerMenu.layer)" >
          <bar-loader :loading="layerMenu.loading.shp"></bar-loader>
          <span class="menu-icon" :class="g3wtemplate.getFontClass('shapefile')"></span>
          <span class="item-text" v-t="'sdk.catalog.menu.download.shp'"></span>
        </div>
      </li>
      <li @click.prevent.stop="" v-if="!layerMenu.layer.projectLayer && layerMenu.layer._type === 'wms'" >
        <div style="display: flex; justify-content: space-between">
          <span class="item-text" v-t="'sdk.catalog.menu.setwmsopacity'"></span>
          <span style="font-weight: bold; margin-left: 5px;">{{layerMenu.layer.opacity}}</span>
        </div>
        <range :value="layerMenu.layer.opacity" :min="0" :max="1" :step="0.1" :sync="true" @changed="_hideMenu" @change-range="setWMSOpacity"></range>
      </li>
      <li v-if="canDownloadGeoTIFF(layerMenu.layer.id)" v-download>
        <div @click.prevent.stop="downloadGeoTIFF(layerMenu.layer.id)" >
          <bar-loader :loading="layerMenu.loading.geotiff"></bar-loader>
          <span class="menu-icon" :class="g3wtemplate.getFontClass('geotiff')"></span>
          <span class="item-text" v-t="'sdk.catalog.menu.download.geotiff'"></span>
        </div>
      </li>
      <li v-if="canDownloadGeoTIFF(layerMenu.layer.id)" v-download>
        <div @click.prevent.stop="downloadGeoTIFF(layerMenu.layer.id, true)" style="position: relative">
          <bar-loader :loading="layerMenu.loading.geotiff"></bar-loader>
          <span class="menu-icon" style="color:#777" :class="g3wtemplate.getFontClass('geotiff')"></span>
          <span style="position: absolute; left: -7px; bottom: 8px; font-size: 1.2em" class="menu-icon" :class="g3wtemplate.getFontClass('crop')"></span>
          <span class="item-text" v-t="'sdk.catalog.menu.download.geotiff_map_extent'"></span>
        </div>
      </li>
      <li v-if="canDownloadShp(layerMenu.layer.id)" v-download>
        <div @click.prevent.stop="downloadShp(layerMenu.layer.id)" >
          <bar-loader :loading="layerMenu.loading.shp"></bar-loader>
          <span class="menu-icon" :class="g3wtemplate.getFontClass('shapefile')"></span>
          <span class="item-text" v-t="'sdk.catalog.menu.download.shp'"></span>
        </div>
      </li>
      <li v-if="canDownloadGpx(layerMenu.layer.id)">
        <div @click.prevent.stop="downloadGpx(layerMenu.layer.id)" v-download>
          <bar-loader :loading="layerMenu.loading.gpx"></bar-loader>
          <span class="menu-icon" :class="g3wtemplate.getFontClass('gpx')"></span>
          <span class="item-text" v-t="'sdk.catalog.menu.download.gpx'"></span>
        </div>
      </li>
      <li v-if="canDownloadGpkg(layerMenu.layer.id)">
        <div @click.prevent.stop="downloadGpkg(layerMenu.layer.id)" v-download>
          <bar-loader :loading="layerMenu.loading.gpkg"></bar-loader>
          <span class="menu-icon" :class="g3wtemplate.getFontClass('gpkg')"></span>
          <span class="item-text" v-t="'sdk.catalog.menu.download.gpkg'"></span>
        </div>
      </li>
      <li v-if="canDownloadCsv(layerMenu.layer.id)">
        <div @click.prevent.stop="downloadCsv(layerMenu.layer.id)" v-download>
          <bar-loader :loading="layerMenu.loading.csv"></bar-loader>
          <span class="menu-icon" :class="g3wtemplate.getFontClass('csv')"></span>
          <span class="item-text" v-t="'sdk.catalog.menu.download.csv'"></span>
        </div>
      </li>
      <li v-if="canDownloadXls(layerMenu.layer.id)" v-download>
        <div @click.prevent.stop="downloadXls(layerMenu.layer.id)">
          <bar-loader :loading="layerMenu.loading.xls"></bar-loader>
          <span class="menu-icon" :class="g3wtemplate.getFontClass('xls')"></span>
          <span class="item-text" v-t="'sdk.catalog.menu.download.xls'"></span>
        </div>
      </li>
      <li v-if="canShowWmsUrl(layerMenu.layer.id)">
        <div @click.prevent.stop="copyUrl({evt: $event, layerId:layerMenu.layer.id, type:'Wms'})" style="display: flex; max-width:300px; align-items: center;">
          <span class="menu-icon" :class="g3wtemplate.getFontClass('map')"></span>
          <div style="display: inline-flex; justify-content: space-between; width: 100%; align-items: baseline">
            <span class="item-text catalog-menu-wms skin-tooltip-top" data-toggle="tooltip" v-t-tooltip="'sdk.catalog.menu.wms.copy'">WMS URL</span>
            <span @click.prevent.stop="" class="bold catalog-menu-wms wms-url-tooltip skin-tooltip-top"
              :class="g3wtemplate.getFontClass('eye')"
              data-placement="top" data-toggle="tooltip" :title="getWmsUrl(layerMenu.layer.id)">
            </span>
          </div>
        </div>
      </li>
      <li v-if="canShowWfsUrl(layerMenu.layer.id)">
        <div @click.prevent.stop="copyUrl({evt: $event, layerId:layerMenu.layer.id, type:'Wfs'})" style="display: flex; max-width:300px; align-items: center;">
          <span class="menu-icon" :class="g3wtemplate.getFontClass('map')"></span>
          <div style="display: inline-flex; justify-content: space-between; width: 100%; align-items: baseline">
            <span class="item-text catalog-menu-wms skin-tooltip-top" data-toggle="tooltip" v-t-tooltip="'sdk.catalog.menu.wms.copy'">WFS URL</span>
            <span @click.prevent.stop="" class="bold catalog-menu-wms wms-url-tooltip skin-tooltip-top"
                  :class="g3wtemplate.getFontClass('eye')"
                  data-placement="top" data-toggle="tooltip" :title="getWfsUrl(layerMenu.layer.id)">
            </span>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script>
import {MAP_SETTINGS} from "app/constant";
import CatalogEventHub from 'gui/catalog/vue/catalogeventhub';
import ChangeMapThemesComponent from 'components/CatalogChangeMapThemes.vue';

const ApplicationService = require('core/applicationservice');
const shpwrite = require('shp-write');
const {t} = require('core/i18n/i18n.service');
const TableComponent = require('gui/table/vue/table');
const GUI = require('gui/gui');
const ControlsRegistry = require('gui/map/control/registry');
const CatalogLayersStoresRegistry = require('core/catalog/cataloglayersstoresregistry');

const ChromeComponent = VueColor.Chrome;
const DEFAULT_ACTIVE_TAB = 'layers';
const OFFSETMENU = {
  top: 50,
  left: 15
};

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
      // to show context menu right click
      layerMenu: {
        show: false,
        top:0,
        left:0,
        tooltip: false,
        name: '',
        layer: null,
        loading: {
          data_table: false,
          shp: false,
          csv: false,
          gpx: false,
          gpkg: false,
          xls: false
        },
        //colorMenu
        colorMenu: {
          show: false,
          top:0,
          left:0,
          color: null
        },
        //styleMenu
        //colorMenu
        stylesMenu: {
          show: false,
          top:0,
          left:0,
          style: null,
          default: null
        },
        //metadataInfo
        metadatainfoMenu: {
          show: false,
          top:0,
          left:0
        }
      }
    }
  },
  directives: {
    //create a vue directive from click outside contextmenu
    'click-outside-layer-menu': {
      bind(el, binding, vnode) {
        this.event = function (event) {
          (!(el === event.target || el.contains(event.target))) && vnode.context[binding.expression](event);
        };
        //add event listener click
        document.body.addEventListener('click', this.event)
      },
      unbind(el) {
        document.body.removeEventListener('click', this.event)
      }
    }
  },
  components: {
    'chrome-picker': ChromeComponent,
    'changemapthemes': ChangeMapThemesComponent

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
    },
    _hideMenu() {
      this.layerMenu.show = false;
      this.layerMenu.styles = false;
      this.layerMenu.loading.data_table = false;
      this.layerMenu.loading.shp = false;
      this.layerMenu.loading.csv = false;
      this.layerMenu.loading.gpx = false;
      this.layerMenu.loading.gpkg = false;
      this.layerMenu.loading.xls = false;
      this.layerMenu.loading.geotiff = false;
    },
    zoomToLayer() {
      const bbox = [this.layerMenu.layer.bbox.minx, this.layerMenu.layer.bbox.miny, this.layerMenu.layer.bbox.maxx, this.layerMenu.layer.bbox.maxy] ;
      const mapService = GUI.getService('map');
      mapService.goToBBox(bbox, this.layerMenu.layer.epsg);
      this._hideMenu();
    },
    canZoom(layer) {
      let canZoom = false;
      if (layer.bbox) {
        const bbox = [layer.bbox.minx, layer.bbox.miny, layer.bbox.maxx, layer.bbox.maxy] ;
        canZoom = bbox.find(coordinate => coordinate > 0);
      }
      return canZoom;
    },
    getGeometryType(layerId, external=false){
      let geometryType;
      if (external){
        const layer = this.state.external.vector.find(layer => layer.id === layerId);
        if (layer) geometryType = layer.geometryType;
      } else {
        const originalLayer = CatalogLayersStoresRegistry.getLayerById(layerId);
        geometryType = originalLayer.config.geometrytype;
      }
      geometryType = geometryType && geometryType !== 'NoGeometry' ? geometryType : '' ;
      return geometryType;
    },
    canShowWmsUrl(layerId) {
      const originalLayer = CatalogLayersStoresRegistry.getLayerById(layerId);
      return originalLayer ? (!!(!originalLayer.isType('table') && originalLayer.getFullWmsUrl())) : false;
    },
    canShowWfsUrl(layerId){
      const originalLayer = CatalogLayersStoresRegistry.getLayerById(layerId);
      return originalLayer && !originalLayer.isType('table') && originalLayer.isWfsActive();
    },
    canDownloadXls(layerId) {
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      return layer ? layer.isXlsDownlodable(): false;
    },
    canDownloadGpx(layerId) {
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      return layer ? layer.isGpxDownlodable(): false;
    },
    canDownloadGpkg(layerId) {
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      return layer ? layer.isGpkgDownlodable(): false;
    },
    canDownloadCsv(layerId){
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      return layer ? layer.isCsvDownlodable(): false;
    },
    canDownloadGeoTIFF(layerId){
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      return layer ? layer.isGeoTIFFDownlodable(): false;
    },
    canDownloadShp(layerId) {
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      return layer ? layer.isShpDownlodable(): false;
    },
    getWmsUrl(layerId) {
      const originalLayer = CatalogLayersStoresRegistry.getLayerById(layerId);
      return originalLayer.getCatalogWmsUrl();
    },
    getWfsUrl(layerId) {
      const originalLayer = CatalogLayersStoresRegistry.getLayerById(layerId);
      return originalLayer.getCatalogWfsUrl();
    },
    copyUrl({evt, layerId, type}={}) {
      const url = this[`get${type}Url`](layerId);
      let ancorEement = document.createElement('a');
      ancorEement.href = url;
      const tempInput = document.createElement('input');
      tempInput.value = ancorEement.href;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand("copy");
      $(evt.target).attr('data-original-title', t('sdk.catalog.menu.wms.copied')).tooltip('show');
      $(evt.target).attr('title', this.copywmsurltooltip).tooltip('fixTitle');
      document.body.removeChild(tempInput);
      ancorEement = null;
      setTimeout(()=>this._hideMenu(), 600);
    },
    downloadGeoTIFF(layerId, map_extent=false){
      const caller_download_id = ApplicationService.setDownload(true);
      this.layerMenu.loading.geotiff = true;
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      layer.getGeoTIFF({
        data:  map_extent ? {
          map_extent: GUI.getService('map').getMapExtent().toString()
        } : undefined
      })
        .catch(err => GUI.notify.error(t("info.server_error")))
        .finally(() => {
          this.layerMenu.loading.geotiff = false;
          ApplicationService.setDownload(false, caller_download_id);
          this._hideMenu();
        })
    },
    downloadShp(layerId) {
      const caller_download_id = ApplicationService.setDownload(true);
      this.layerMenu.loading.shp = true;
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      layer.getShp()
        .catch(err => GUI.notify.error(t("info.server_error")))
        .finally(() => {
          this.layerMenu.loading.shp = false;
          ApplicationService.setDownload(false, caller_download_id);
          this._hideMenu();
        })
    },
    downloadCsv(layerId) {
      const caller_download_id = ApplicationService.setDownload(true);
      this.layerMenu.loading.csv = true;
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      layer.getCsv()
        .catch(err => GUI.notify.error(t("info.server_error")))
        .finally(() => {
          this.layerMenu.loading.csv = false;
          ApplicationService.setDownload(false, caller_download_id);
          this._hideMenu();
        })
    },
    downloadXls(layerId) {
      const caller_download_id = ApplicationService.setDownload(true);
      this.layerMenu.loading.xls = true;
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      layer.getXls()
        .catch(err => GUI.notify.error(t("info.server_error")))
        .finally(() => {
          this.layerMenu.loading.xls = false;
          ApplicationService.setDownload(false, caller_download_id);
          this._hideMenu();
      })
    },
    downloadGpx(layerId) {
      const caller_download_id = ApplicationService.setDownload(true);
      this.layerMenu.loading.gpx = true;
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      layer.getGpx()
        .catch(err => GUI.notify.error(t("info.server_error")))
        .finally(() => {
          this.layerMenu.loading.gpx = false;
          ApplicationService.setDownload(false, caller_download_id);
          this._hideMenu();
      })
    },
    downloadGpkg(layerId) {
      const caller_download_id = ApplicationService.setDownload(true);
      this.layerMenu.loading.gpkg = true;
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      layer.getGpkg()
        .catch(err => GUI.notify.error(t("info.server_error")))
        .finally(() => {
          this.layerMenu.loading.gpkg = false;
          ApplicationService.setDownload(false, caller_download_id);
          this._hideMenu();
        })
    },
    changeLayerMapPosition({position, layer}){
      const mapService = GUI.getService('map');
      const changed = layer.position !== position;
      layer.position = position;
      mapService.changeLayerMapPosition({
        id: layer.id,
        position
      });
      changed && this._hideMenu();
    },
    setWMSOpacity({id=this.layerMenu.layer.id, value:opacity}){
      this.layerMenu.layer.opacity = opacity;
      const mapService = GUI.getService('map');
      mapService.changeLayerOpacity({
        id,
        opacity
      });
    },
    /**
     * Create a Geojson file from vector OL vector layer and download it in shapefile with WGS84 Projection
     * @param layer
     * @returns {Promise<void>}
     */
    async downloadExternalShapefile(layer){
      const EPSG4326 = 'EPSG:4326';
      this.layerMenu.loading.shp = true;
      const mapService = GUI.getService('map');
      const vectorLayer = mapService.getLayerByName(layer.name);
      const GeoJSONFormat = new ol.format.GeoJSON();
      let features = vectorLayer.getSource().getFeatures();
      if (layer.crs !== EPSG4326){
        features = features.map(feature => {
          const clonefeature = feature.clone();
          clonefeature.getGeometry().transform(layer.crs, EPSG4326);
          return clonefeature;
        })
      }
      const GeoJSONFile = GeoJSONFormat.writeFeaturesObject(features, {
        featureProjection: EPSG4326
      });
      const name = layer.name.split(`.${layer.type}`)[0];
      shpwrite.download(GeoJSONFile,{
        folder: name,
        types: {
          point:name,
          mulipoint: name,
          polygon: name,
          multipolygon: name,
          line: name,
          polyline: name,
          multiline: name
        }
      });
      await this.$nextTick();
      this.layerMenu.loading.shp = false;
      this._hideMenu();
    },
    showAttributeTable(layerId) {
      this.layerMenu.loading.data_table = false;
      GUI.closeContent();
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      this.layerMenu.loading.data_table = true;
      const tableContent = new TableComponent({
        layer,
        formatter: 1
      });
      tableContent.on('show', () => {
        this.isMobile() && GUI.hideSidebar();
        this.layerMenu.loading.data_table = false;
        this._hideMenu();
      });
      tableContent.show({
        title: layer.getName()
      });
    },
    startEditing() {
      let layer;
      const catallogLayersStores = CatalogLayersStoresRegistry.getLayersStores();
      catallogLayersStores.forEach(layerStore => {
        layer = layerStore.getLayerById(this.layerMenu.layer.id);
        if (layer) {
          layer.getLayerForEditing();
          return false;
        }
      });
    },
    closeLayerMenu() {
      this._hideMenu();
      this.showColorMenu(false);
      this.layerMenu.stylesMenu.show = false;
    },
    onbeforeDestroyChangeColor(){
     this.$refs.color_picker.$off();
    },
    onChangeColor(val) {
      const mapService = GUI.getService('map');
      this.layerMenu.layer.color = val;
      const layer = mapService.getLayerByName(this.layerMenu.name);
      const style = layer.getStyle();
      style._g3w_options.color = val;
      layer.setStyle(style);
    },
    setCurrentLayerStyle(index){
      let changed = false;
      this.layerMenu.layer.styles.forEach((style, idx) =>{
        if (idx === index) {
          this.layerMenu.stylesMenu.style = style.name;
          changed = !style.current;
          style.current = true;
        } else style.current = false;
      });
      if (changed) {
        const layerId = this.layerMenu.layer.id;
        const layer = CatalogLayersStoresRegistry.getLayerById(this.layerMenu.layer.id);
        if (layer) {
          CatalogEventHub.$emit('layer-change-style', {
            layerId
          });
          layer.change();
        }
      }
      this.closeLayerMenu();
    },
    async showStylesMenu(bool, evt) {
      if (bool) {
        const elem = $(evt.target);
        this.layerMenu.stylesMenu.top = elem.offset().top;
        this.layerMenu.stylesMenu.left = elem.offset().left + elem.width() + ((elem.outerWidth() - elem.width()) /2) + OFFSETMENU.left;
        await this.$nextTick();
      }
      this.layerMenu.stylesMenu.show = bool;
    },
    //showmetadatainfo
    async showMetadataInfo(bool, evt){
      if (bool) {
        const elem = $(evt.target);
        this.layerMenu.metadatainfoMenu.top = elem.offset().top;
        this.layerMenu.metadatainfoMenu.left = elem.offset().left + elem.width() + ((elem.outerWidth() - elem.width()) /2) + OFFSETMENU.left;
        await this.$nextTick();
      }
      this.layerMenu.metadatainfoMenu.show = bool;
    },
    showColorMenu(bool, evt) {
      if (bool) {
        const elem = $(evt.target);
        this.layerMenu.colorMenu.top = elem.offset().top;
        this.layerMenu.colorMenu.left = elem.offset().left + elem.width() + ((elem.outerWidth() - elem.width()) / 2) - OFFSETMENU.left;
      }
      this.layerMenu.colorMenu.show = bool;
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
    CatalogEventHub.$on('unselectionlayer', (storeid, layerstree) => {
      const layer = CatalogLayersStoresRegistry.getLayersStore(storeid).getLayerById(layerstree.id);
      layer.clearSelectionFids();
    });

    CatalogEventHub.$on('activefiltertokenlayer', async (storeid, layerstree) => {
      const layer = CatalogLayersStoresRegistry.getLayersStore(storeid).getLayerById(layerstree.id);
      layerstree.filter.active =  await layer.toggleFilterToken();
    });

    /**
     * Visible change layer
     */
    CatalogEventHub.$on('treenodevisible', layer => {
      const mapservice = GUI.getService('map');
      mapservice.emit('cataloglayervisible', layer);
    });

    /**
     * Eevent handle of select layer
     */
    CatalogEventHub.$on('treenodeselected', function (storeid, node) {
      const mapservice = GUI.getService('map');
      let layer = CatalogLayersStoresRegistry.getLayersStore(storeid).getLayerById(node.id);
      CatalogLayersStoresRegistry.getLayersStore(storeid).selectLayer(node.id, !layer.isSelected());
      // emit signal of select layer from catalog
      mapservice.emit('cataloglayerselected', layer);
    });

    CatalogEventHub.$on('showmenulayer', async (layerstree, evt) => {
      this._hideMenu();
      await this.$nextTick();
      this.layerMenu.left = evt.x;
      this.layerMenu.name = layerstree.name;
      this.layerMenu.layer = layerstree;
      this.layerMenu.show = true;
      this.layerMenu.colorMenu.color = layerstree.color;
      await this.$nextTick();
      this.layerMenu.top = $(evt.target).offset().top - $(this.$refs['layer-menu']).height() + ($(evt.target).height()/ 2);
      $('.catalog-menu-wms[data-toggle="tooltip"]').tooltip();
    });

    ControlsRegistry.onafter('registerControl', (id, control) => {
      if (id === 'querybbox') {
        control.getInteraction().on('propertychange', evt => {
          if (evt.key === 'active') this.state.highlightlayers = !evt.oldValue;
        })
      }
    });
  },
  beforeMount(){
    this.currentBaseLayer = this.project.state.initbaselayer;
  }
};
</script>