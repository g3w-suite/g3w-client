<!--
  @file
  @since v3.7.0
-->

<template>

  <ul v-if="layerMenu.show"
    id="layer-context-menu"
    ref="layer-menu"
    class="catalog-context-menu"
    v-click-outside-context-menu="closeLayerMenu"
    tabindex="-1"
    :style="{top: layerMenu.top + 'px', left: layerMenu.left + 'px' }"
  >

    <!-- Item Title -->
    <li class="title">
      <div>{{ layerMenu.layer.title}}</div>
      <div style="font-weight: normal; font-size: 0.8em">{{getGeometryType(layerMenu.layer.id, layerMenu.layer.external)}}</div>
    </li>

    <!-- TODO add item description -->
    <li v-if="!layerMenu.layer.projectLayer">
      <div style="display: flex; justify-content: space-between; align-items: center">
        <layerspositions @layer-position-change="changeLayerMapPosition({position:$event, layer: layerMenu.layer})" style="display: flex; flex-direction: column; justify-content: space-between" :position="layerMenu.layer.position"></layerspositions>
      </div>
    </li>

    <!-- TODO add item description -->
    <li v-if="layerMenu.layer.metadata && layerMenu.layer.metadata.abstract" @mouseleave.self="showMetadataInfo(false)"  @mouseover.self="showMetadataInfo(true,  $event)">
      <span class="menu-icon skin-color-dark" :class="g3wtemplate.getFontClass('info')"></span>
      <span class="item-text" v-t="'Metadata'"></span>
      <div v-show="layerMenu.metadatainfoMenu.show" style="position:fixed; background-color: #FFFFFF; color:#000000; padding-left: 0; border-radius: 0 3px 3px 0;" :style="{ top: layerMenu.metadatainfoMenu.top + 'px', left: `${layerMenu.metadatainfoMenu.left+1}px` }">
        <div class="layer-menu-metadata-info" style="padding: 5px;" v-html="layerMenu.layer.metadata.abstract"></div>
      </div>
    </li>

    <!-- Styles menu -->
    <li v-if="layerMenu.layer.geolayer && layerMenu.layer.styles && layerMenu.layer.styles.length > 1" @mouseleave.self="showStylesMenu(false,$event)" @mouseover.self="showStylesMenu(true,$event)" class="menu-icon">
      <span class="menu-icon skin-color-dark" :class="g3wtemplate.getFontClass('palette')"></span>
      <span class="item-text" v-t="'catalog_items.contextmenu.styles'"></span>
      <span class="menu-icon" style="position: absolute; right: 0; margin-top: 3px" :class="g3wtemplate.getFontClass('arrow-right')"></span>
      <ul v-show="layerMenu.stylesMenu.show" style="position:fixed; padding-left: 0; background-color: #FFFFFF; color:#000000" :style="{ top: layerMenu.stylesMenu.top + 'px', left: `${layerMenu.stylesMenu.left}px`, maxHeight: layerMenu.stylesMenu.maxHeight + 'px', overflowY: layerMenu.stylesMenu.overflowY }">
        <li v-for="(style, index) in layerMenu.layer.styles" @click.stop="setCurrentLayerStyle(index)" :key="style.name">
          <span v-if="style.current" style="font-size: 0.8em;" :class="g3wtemplate.getFontClass('circle')"></span>
          <span>{{style.name}}
            <span v-if="style.name === layerMenu.layer.defaultstyle && layerMenu.layer.styles.length > 1">(<span v-t="'default'"></span>)</span></span>
        </li>
      </ul>
    </li>

    <!-- Opacity menu -->
    <li v-if="layerMenu.layer.geolayer && layerMenu.layer.visible" class="menu-icon" style="padding-right: 0">
      <layer-opacity-picker
        @init-menu-item="addLayerMenuItem"
        @show-menu-item="showSubMenuContext"
        :layer="layerMenu.layer"
      />
    </li>

    <!-- Zoom to Layer -->
    <li v-if="canZoom(layerMenu.layer)" @click.prevent.stop="zoomToLayer(layerMenu.layer)">
      <span class="menu-icon skin-color-dark" :class="g3wtemplate.getFontClass('search')"></span>
      <span class="item-text" v-t="'catalog_items.contextmenu.zoomtolayer'"></span>
    </li>

    <!-- Attribute Table -->
    <li v-if="layerMenu.layer.openattributetable" @click.prevent.stop="showAttributeTable(layerMenu.layer.id)">
      <bar-loader :loading="layerMenu.loading.data_table"></bar-loader>
      <span class="menu-icon skin-color-dark" :class="g3wtemplate.getFontClass('list')"> </span>
      <span class="item-text" v-t="'catalog_items.contextmenu.open_attribute_table'"></span>
    </li>

    <!-- TODO add item description -->
    <li @click.prevent.stop="" v-if="!layerMenu.layer.projectLayer && layerMenu.layer._type !== 'wms'" @mouseleave.self="showColorMenu(false,$event)" @mouseover.self="showColorMenu(true,$event)">
      <span class="item-text" v-t="'catalog_items.contextmenu.vector_color_menu'"></span>
      <span class="menu-icon skin-color-dark" style="position: absolute; right: 0; margin-top: 3px" :class="g3wtemplate.getFontClass('arrow-right')"></span>
      <ul v-if="layerMenu.colorMenu.show" style="position:fixed" :style="{ top: layerMenu.colorMenu.top + 'px', left: layerMenu.colorMenu.left + 'px' }">
        <li style="padding:0;">
          <chrome-picker
            ref="color_picker"
            @click.prevent.stop=""
            @hook:beforeDestroy="onbeforeDestroyChangeColor"
            v-model="layerMenu.colorMenu.color"
            @input="onChangeColor"
            style="width: 100%"
          ></chrome-picker>
        </li>
      </ul>
    </li>

    <!-- TODO add item description -->
    <li @click.prevent.stop="" v-if="!layerMenu.layer.projectLayer && layerMenu.layer._type !== 'wms'" v-download>
      <div @click.prevent.stop="downloadExternalShapefile(layerMenu.layer)" >
        <bar-loader :loading="layerMenu.loading.shp"></bar-loader>
        <span class="menu-icon skin-color-dark" :class="g3wtemplate.getFontClass('shapefile')"></span>
        <span class="item-text" v-t="'sdk.catalog.menu.download.shp'"></span>
      </div>
    </li>

    <!-- TODO add item description -->
    <li @click.prevent.stop="" v-if="!layerMenu.layer.projectLayer && layerMenu.layer._type === 'wms'" >
      <div style="display: flex; justify-content: space-between">
        <span class="item-text" v-t="'sdk.catalog.menu.setwmsopacity'"></span>
        <span style="font-weight: bold; margin-left: 5px;">{{layerMenu.layer.opacity}}</span>
      </div>
      <range :value="layerMenu.layer.opacity" :min="0" :max="1" :step="0.1" :sync="true" @changed="_hideMenu" @change-range="setWMSOpacity"></range>
    </li>

    <!-- Download as GeoTIFF -->
    <li v-if="canDownloadGeoTIFF(layerMenu.layer.id)" v-download>
      <div @click.prevent.stop="downloadGeoTIFF(layerMenu.layer.id)" >
        <bar-loader :loading="layerMenu.loading.geotiff"></bar-loader>
        <span class="menu-icon skin-color-dark" :class="g3wtemplate.getFontClass('geotiff')"></span>
        <span class="item-text" v-t="'sdk.catalog.menu.download.geotiff'"></span>
      </div>
    </li>

    <!-- Download as GeoTIFF -->
    <li v-if="canDownloadGeoTIFF(layerMenu.layer.id)" v-download>
      <div @click.prevent.stop="downloadGeoTIFF(layerMenu.layer.id, true)" style="position: relative">
        <bar-loader :loading="layerMenu.loading.geotiff"></bar-loader>
        <span class="menu-icon skin-color-dark" style="color:#777" :class="g3wtemplate.getFontClass('geotiff')"></span>
        <span style="position: absolute; left: -7px; bottom: 8px; font-size: 1.2em" class="menu-icon skin-color-dark" :class="g3wtemplate.getFontClass('crop')"></span>
        <span class="item-text" v-t="'sdk.catalog.menu.download.geotiff_map_extent'"></span>
      </div>
    </li>

    <!-- Download as SHP -->
    <li v-if="canDownloadShp(layerMenu.layer.id)" v-download>
      <div @click.prevent.stop="downloadShp(layerMenu.layer.id)" >
        <bar-loader :loading="layerMenu.loading.shp"></bar-loader>
        <span class="menu-icon skin-color-dark" :class="g3wtemplate.getFontClass('shapefile')"></span>
        <span class="item-text" v-t="'sdk.catalog.menu.download.shp'"></span>
      </div>
    </li>

    <!-- Download as GPX -->
    <li v-if="canDownloadGpx(layerMenu.layer.id)">
      <div @click.prevent.stop="downloadGpx(layerMenu.layer.id)" v-download>
        <bar-loader :loading="layerMenu.loading.gpx"></bar-loader>
        <span class="menu-icon skin-color-dark" :class="g3wtemplate.getFontClass('gpx')"></span>
        <span class="item-text" v-t="'sdk.catalog.menu.download.gpx'"></span>
      </div>
    </li>

    <!-- Download as Gpkg -->
    <li v-if="canDownloadGpkg(layerMenu.layer.id)">
      <div @click.prevent.stop="downloadGpkg(layerMenu.layer.id)" v-download>
        <bar-loader :loading="layerMenu.loading.gpkg"></bar-loader>
        <span class="menu-icon skin-color-dark" :class="g3wtemplate.getFontClass('gpkg')"></span>
        <span class="item-text" v-t="'sdk.catalog.menu.download.gpkg'"></span>
      </div>
    </li>

    <!-- Download as CSV -->
    <li v-if="canDownloadCsv(layerMenu.layer.id)">
      <div @click.prevent.stop="downloadCsv(layerMenu.layer.id)" v-download>
        <bar-loader :loading="layerMenu.loading.csv"></bar-loader>
        <span class="menu-icon skin-color-dark" :class="g3wtemplate.getFontClass('csv')"></span>
        <span class="item-text" v-t="'sdk.catalog.menu.download.csv'"></span>
      </div>
    </li>

    <!-- Download as XLS -->
    <li v-if="canDownloadXls(layerMenu.layer.id)" v-download>
      <div @click.prevent.stop="downloadXls(layerMenu.layer.id)">
        <bar-loader :loading="layerMenu.loading.xls"></bar-loader>
        <span class="menu-icon skin-color-dark" :class="g3wtemplate.getFontClass('xls')"></span>
        <span class="item-text" v-t="'sdk.catalog.menu.download.xls'"></span>
      </div>
    </li>

    <!-- Click to Copy WMS URL -->
    <li v-if="canShowWmsUrl(layerMenu.layer.id)">
      <div @click.prevent.stop="copyUrl({evt: $event, layerId:layerMenu.layer.id, type:'Wms'})" style="display: flex; max-width:300px; align-items: center;">
        <span class="menu-icon skin-color-dark" :class="g3wtemplate.getFontClass('map')"></span>
        <div style="display: inline-flex; justify-content: space-between; width: 100%; align-items: baseline">
          <span class="item-text catalog-menu-wms skin-tooltip-top" data-toggle="tooltip" v-t-tooltip="'sdk.catalog.menu.wms.copy'">WMS URL</span>
          <span class="bold catalog-menu-wms wms-url-tooltip skin-tooltip-top skin-color-dark"
                :class="g3wtemplate.getFontClass('eye')"
                data-placement="top" data-toggle="tooltip" :title="getWmsUrl(layerMenu.layer.id)">
            </span>
        </div>
      </div>
    </li>

    <!-- Click to Copy WFS URL -->
    <li v-if="canShowWfsUrl(layerMenu.layer.id)">
      <div @click.prevent.stop="copyUrl({evt: $event, layerId:layerMenu.layer.id, type:'Wfs'})" style="display: flex; max-width:300px; align-items: center;">
        <span class="menu-icon skin-color-dark" :class="g3wtemplate.getFontClass('map')"></span>
        <div style="display: inline-flex; justify-content: space-between; width: 100%; align-items: baseline">
          <span class="item-text catalog-menu-wms skin-tooltip-top" data-toggle="tooltip" v-t-tooltip="'sdk.catalog.menu.wms.copy'">WFS URL</span>
          <span class="bold catalog-menu-wms wms-url-tooltip skin-tooltip-top skin-color-dark"
                :class="g3wtemplate.getFontClass('eye')"
                data-placement="top" data-toggle="tooltip" :title="getWfsUrl(layerMenu.layer.id)">
            </span>
        </div>
      </div>
    </li>

  </ul>
</template>

<script>
  import { Chrome as ChromeComponent } from 'vue-color';

  import LayerOpacityPicker from "components/LayerOpacityPicker.vue";

  import CatalogEventHub from 'gui/catalog/vue/catalogeventhub';
  import CatalogLayersStoresRegistry from 'store/catalog-layers';
  import ApplicationService from 'services/application';
  import GUI from 'services/gui';

  const { t } = require('core/i18n/i18n.service');
  const shpwrite = require('shp-write');
  const TableComponent = require('gui/table/vue/table');

  const OFFSETMENU = {
    top: 50,
    left: 15
  };

  export default {
    name: 'Cataloglayermenu',
    props: {
      external: {
        type: Object
      }
    },
    data(){
      return {
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
    components: {
      'chrome-picker':        ChromeComponent,
      'layer-opacity-picker': LayerOpacityPicker,
    },
    methods: {

      /**
       * @TODO find out a  a better way to handle this, eg:
       *       using only the `showSubMenuContext()` method
       */
      addLayerMenuItem(item={}){
        this.layerMenu = ({
          ...this.layerMenu,
          ...item
        });
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
      closeLayerMenu(menu={}) {
        this._hideMenu();
        this.showColorMenu(false);
        menu.show = false;
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
        if (changed) {
          layer.position = position;
          mapService.changeLayerMapPosition({
            id: layer.id,
            position
          });
          changed && this._hideMenu();
        }
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
       * @TODO refactor this, almost the same as: `CatalogTristateTree.vue::zoomToLayer(layer))`
       *
       * @FIXME add description
       *
       * @param layer
       */
      zoomToLayer(layer) {
        GUI
          .getService('map')
          .goToBBox(
            [layer.bbox.minx, layer.bbox.miny, layer.bbox.maxx, layer.bbox.maxy],
            layer.epsg
          );
        this._hideMenu();
      },

      /**
       * @TODO refactor this, almost the same as: `CatalogTristateTree.vue::canZoom(layer))`
       *
       * Check if layer has bbox property
       *
       * @param layer
       */
      canZoom(layer) {
        return (layer.bbox && [layer.bbox.minx, layer.bbox.miny, layer.bbox.maxx, layer.bbox.maxy].find(coordinate => coordinate > 0));
      },

      getGeometryType(layerId, external=false){
        let geometryType;
        if (external){
          const layer = this.external.vector.find(layer => layer.id === layerId);
          if (layer) geometryType = layer.geometryType;
        } else {
          const originalLayer = CatalogLayersStoresRegistry.getLayerById(layerId);
          geometryType = originalLayer.config.geometrytype;
        }
        geometryType = geometryType && geometryType !== 'NoGeometry' ? geometryType : '' ;
        return geometryType;
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
        this.closeLayerMenu(this.layerMenu.stylesMenu);
      },
      /**
       * Context menu: toggle "styles" submenu handling its correct horizontal and vertical alignment
       */
      async showSubMenuContext({menu, bool, evt}) {
        if (bool) {
          const elem = $(evt.target);
          menu.top = elem.offset().top;
          menu.left = (elem.offset().left + elem.width() + ((elem.outerWidth() - elem.width()) /2) + OFFSETMENU.left);
          const contextmenu = $(this.$refs['layer-menu']);
          const menuentry = $(evt.target);
          const submenu = menuentry.children('ul');
          const height = submenu.height();
          const maxH = contextmenu.height();
          menu.maxHeight = height >= maxH ? maxH : null;
          menu.overflowY = height >= maxH ? 'scroll' : null;
          menu.top = (height >= maxH ? contextmenu : menuentry).offset().top;
          menu.left = this.isMobile() ? 0 :  menuentry.offset().left + menuentry.width() + ((menuentry.outerWidth() - menuentry.width()) /2) + OFFSETMENU.left;
          await this.$nextTick();
        }
        menu.show = bool;
      },
      /**
       * Context menu: toggle "styles" submenu handling its correct horizontal and vertical alignment
       */
      async showStylesMenu(bool, evt) {
        this.showSubMenuContext({
          menu: this.layerMenu.stylesMenu,
          bool,
          evt
        });
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
          const contextmenu = $(this.$refs['layer-menu']);
          this.layerMenu.colorMenu.top = contextmenu.offset().top;
          this.layerMenu.colorMenu.left = elem.offset().left + elem.width() + ((elem.outerWidth() - elem.width()) / 2) - OFFSETMENU.left;
        }
        this.layerMenu.colorMenu.show = bool;
      }
    },
    created() {
      CatalogEventHub.$on('show-layer-context-menu', async (layerstree, evt) => {
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
      CatalogEventHub.$on('hide-layer-context-menu', this._hideMenu)
    }
  };
</script>
<style scoped>
  li .item-text{
    font-weight: bold;
  }
</style>
