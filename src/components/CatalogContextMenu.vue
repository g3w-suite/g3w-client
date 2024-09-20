<!--
  @file
  @since v3.11.0
-->

<template>

  <!-- PROJECT MENU -->
  <ul
    v-if            = "edit_url && menu.show"
    id              = "project-context-menu"
    ref             = "project-context-menu"
    class           = "catalog-context-menu"
    v-click-outside = "__hideMenu"
    tabindex        = "-1"
    :style          = "{
      top:  menu.top + 'px',
      left: menu.left + 'px'
    }"
  >

    <!-- Item Title -->
    <li class = "title">
      <div>G3W-ADMIN {{ menu.title}}</div>
    </li>

    <!-- Click to open G3W-ADMIN's project page -->
    <li>
      <div>
        <!-- TODO: g3wtemplate.getFontClass('qgis') -->
        <span class = "menu-icon skin-color-dark">
          <svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 32 32" style="height: 14px; vertical-align: -1.5px; fill: currentColor;">
            <path d="m17.61 17.63 4.36-.02-4-3.98h-4.36v4l4 4.45z"/>
            <path d="m31.61 27.22-7.62-7.6-4.38.01v4.33l7.24 7.67h4.76z"/>
            <path d="M18 25.18c-.68.16-1.17.2-1.9.2a9.77 9.77 0 0 1-9.68-9.88c0-5.57 4.4-9.78 9.68-9.78s9.48 4.2 9.48 9.78c0 .91-.15 1.96-.36 2.8l4.88 4.65a15 15 0 0 0 1.95-7.48C32.05 6.87 25.19.44 16 .44 6.86.44 0 6.84 0 15.47c0 8.68 6.86 15.2 16 15.2 2.36 0 4.23-.3 6.2-1.1L18 25.18z"/>
          </svg>
        </span>
        <b><a :href = "edit_url" @click.stop = "__hideMenu" target = "_blank" style = "color: initial">Project settings</a></b>
      </div>
    </li>

  </ul>

  <!-- LAYER MENU -->
  <ul
    v-else-if       = "layerMenu.show"
    id              = "layer-context-menu"
    ref             = "layer-menu"
    class           = "catalog-context-menu"
    v-click-outside = "closeLayerMenu"
    tabindex        = "-1"
    :style          = "{
      top:  layerMenu.top + 'px',
      left: layerMenu.left + 'px',
    }"
  >

    <!-- Item Title -->
    <li class = "title">
      <div>{{ layerMenu.layer.title}}</div>
      <div style = "font-weight: normal; font-size: 0.8em">
        {{ getGeometryType(layerMenu.layer.id, layerMenu.layer.external) }}
      </div>
    </li>

    <!-- Change z-index of ol layer. On top or button -->
    <li v-if = "isExternalLayer(layerMenu.layer)">
      <div style = "display: flex; justify-content: space-between; align-items: center">
        <layerspositions
          @layer-position-change = "changeLayerMapPosition({position:$event, layer: layerMenu.layer})"
          style                  = "display: flex; flex-direction: column; justify-content: space-between"
          :position              = "layerMenu.layer.position"
        />
      </div>
    </li>

    <!-- TODO add item description -->
    <li
      v-if             = "hasMetadataInfo(layerMenu.layer)"
      @mouseleave.self = "showMetadataInfo(false)"
      @mouseover.self  = "showMetadataInfo(true,  $event)"
    >
      <span
        class  = "menu-icon skin-color-dark"
        :class = "g3wtemplate.getFontClass('info')">
      </span>
      <span class = "item-text" v-t = "'Metadata'"></span>
      <div
        v-show = "layerMenu.metadatainfoMenu.show"
        style  = "position:fixed; background-color: #FFFFFF; color:#000000; padding-left: 0; border-radius: 0 3px 3px 0;"
        :style = "{
          top:   layerMenu.metadatainfoMenu.top       + 'px',
          left: (layerMenu.metadatainfoMenu.left + 1) + 'px',
        }"
      >
        <div
          class  = "layer-menu-metadata-info"
          style  = "padding: 5px;"
          v-html = "layerMenu.layer.metadata.abstract">
        </div>
      </div>
    </li>

    <!-- Styles menu -->
    <li
      v-if             = "canShowStylesMenu(layerMenu.layer)"
      @mouseleave.self = "showStylesMenu(false, $event)"
      @mouseover.self  = "showStylesMenu(true, $event)"
      class            = "menu-icon"
    >
      <span
        class  = "menu-icon skin-color-dark"
        :class = "g3wtemplate.getFontClass('palette')">
      </span>
      <span
        class = "item-text"
        v-t   = "'catalog_items.contextmenu.styles'">
      </span>
      <span
        class  = "menu-icon"
        style  = "position: absolute; right: 0; margin-top: 3px"
        :class = "g3wtemplate.getFontClass('arrow-right')">
      </span>
      <ul
        v-show  = "layerMenu.stylesMenu.show"
        style   = "position:fixed; padding-left: 0; background-color: #FFFFFF; color:#000000"
        :style = "{
          top:       layerMenu.stylesMenu.top       + 'px',
          left:      layerMenu.stylesMenu.left      + 'px',
          maxHeight: layerMenu.stylesMenu.maxHeight + 'px',
          overflowY: layerMenu.stylesMenu.overflowY,
        }"
      >
        <li
          v-for       = "(style, index) in layerMenu.layer.styles"
          @click.stop = "setCurrentLayerStyle(index)"
          :key        = "style.name"
        >
          <span
            v-if   = "style.current"
            style  = "font-size: 0.8em;"
            :class = "g3wtemplate.getFontClass('circle')">
          </span>
          <span>{{ getStyleName(style) }}</span>
        </li>
      </ul>
    </li>

    <!-- Opacity menu -->
    <li
      v-if  = "canShowOpacityPicker(layerMenu.layer)"
      class = "menu-icon"
      style = "padding-right: 0"
    >
      <layer-opacity-picker
        @init-menu-item = "addLayerMenuItem"
        @show-menu-item = "showSubMenuContext"
        :layer          = "layerMenu.layer"
      />
    </li>

    <!-- Zoom to Layer -->
    <li
      v-if                = "canZoom(layerMenu.layer)"
      @click.prevent.stop = "zoomToLayer(layerMenu.layer)"
    >
      <span
        class  = "menu-icon skin-color-dark"
        :class = "g3wtemplate.getFontClass('search')">
      </span>
      <span
        class = "item-text"
        v-t   = "'catalog_items.contextmenu.zoomtolayer'">
      </span>
    </li>

    <!-- Attribute Table -->
    <li
      v-if                = "canOpenAttributeTable(layerMenu.layer)"
      @click.prevent.stop = "showAttributeTable(layerMenu.layer.id)"
    >
      <span
        class  = "menu-icon skin-color-dark"
        :class = "g3wtemplate.getFontClass('list')"> </span>
      <span
        class = "item-text"
        v-t   = "'catalog_items.contextmenu.open_attribute_table'">
      </span>
    </li>

    <!-- Color picker (external vector layer) -->
    <li
      v-if                = "isExternalVectorLayer(layerMenu.layer)"
      @click.prevent.stop = ""
      @mouseleave.self    = "showColorMenu(false,$event)"
      @mouseover.self     = "showColorMenu(true,$event)"
    >
      <span
        class = "item-text"
        v-t   = "'catalog_items.contextmenu.vector_color_menu'">
      </span>
      <span
        class  = "menu-icon skin-color-dark"
        style  = "position: absolute; right: 0; margin-top: 3px"
        :class = "g3wtemplate.getFontClass('arrow-right')">
      </span>
      <ul
        v-if   = "layerMenu.colorMenu.show"
        style  = "position:fixed"
        :style = "{
          top:  layerMenu.colorMenu.top + 'px',
          left: layerMenu.colorMenu.left + 'px',
        }"
      >
        <li style = "padding:0;">
          <chrome-picker
            ref                 = "color_picker"
            v-model             = "layerMenu.colorMenu.color"
            @click.prevent.stop = ""
            @hook:beforeDestroy = "onbeforeDestroyChangeColor"
            @input              = "onChangeColor"
            style               = "width: 100%"
          />
        </li>
      </ul>
    </li>

    <!-- Download an external layer file from a proxy server url -->
    <li
      v-if                = "isExternalVectorLayer(layerMenu.layer) && layerMenu.layer.downloadUrl"
      @click.prevent.stop = ""
      v-download
    >
      <div
        @click.prevent.stop = "downloadExternal(layerMenu.layer.downloadUrl)"
      >
        <bar-loader :loading = "layerMenu.loading.unknow"/>
        <span
          class  = "menu-icon skin-color-dark"
          :class = "g3wtemplate.getFontClass('download')">
        </span>
        <span
          class = "item-text"
          v-t   = "'sdk.catalog.menu.download.unknow'">
        </span>
      </div>
    </li>

    <!-- Download an external layer file as shapefile -->
    <li
      v-if                = "isExternalVectorLayer(layerMenu.layer) && !layerMenu.layer.downloadUrl"
      @click.prevent.stop = ""
      v-download
    >
      <div
        @click.prevent.stop = "downloadExternalShapefile(layerMenu.layer)"
      >
        <bar-loader :loading = "layerMenu.loading.shp"/>

        <span
          class  = "menu-icon skin-color-dark"
          :class = "g3wtemplate.getFontClass('shapefile')">
        </span>
        <span
          class = "item-text"
          v-t   = "'sdk.catalog.menu.download.shp'">
        </span>
      </div>
    </li>

    <!-- Change opacity (external wms layer) -->
    <li
      v-if                = "isExternalWMSLayer(layerMenu.layer)"
      @click.prevent.stop = ""
    >
      <div style = "display: flex; justify-content: space-between">
        <span
          class = "item-text"
          v-t   = "'sdk.catalog.menu.setwmsopacity'">
        </span>
        <span style = "font-weight: bold; margin-left: 5px;">{{ layerMenu.layer.opacity }}</span>
      </div>
      <range
        :value        = "layerMenu.layer.opacity"
        :min          = "0"
        :max          = "1"
        :step         = "0.1"
        :sync         = "true"
        @changed      = "_hideMenu"
        @change-range = "setWMSOpacity"
      />
    </li>

    <!-- Download as GeoTIFF -->
    <li
      v-if = "canDownloadGeoTIFF(layerMenu.layer.id)"
      v-download
    >
      <div
        @click.prevent.stop = "downloadGeoTIFF(layerMenu.layer.id)"
      >
        <bar-loader :loading="layerMenu.loading.geotiff"/>
        <span
          class  = "menu-icon skin-color-dark"
          :class = "g3wtemplate.getFontClass('geotiff')">
        </span>
        <span
          class = "item-text"
          v-t   = "'sdk.catalog.menu.download.geotiff'">
        </span>
      </div>
    </li>

    <!-- Download as GeoTIFF -->
    <li
      v-if = "canDownloadGeoTIFF(layerMenu.layer.id)"
      v-download
    >
      <div
        @click.prevent.stop = "downloadGeoTIFF(layerMenu.layer.id, true)"
        style               = "position: relative"
      >
        <bar-loader :loading = "layerMenu.loading.geotiff"/>
        <span
          class  = "menu-icon skin-color-dark"
          style  = "color:#777"
          :class = "g3wtemplate.getFontClass('geotiff')">
        </span>
        <span
          style  = "position: absolute; left: -7px; bottom: 8px; font-size: 1.2em"
          class  = "menu-icon skin-color-dark"
          :class = "g3wtemplate.getFontClass('crop')">
        </span>
        <span
          class = "item-text"
          v-t   = "'sdk.catalog.menu.download.geotiff_map_extent'">
        </span>
      </div>
    </li>

    <!-- Download as SHP -->
    <li
      v-if = "canDownloadShp(layerMenu.layer.id)"
      v-download
    >
      <div
        @click.prevent.stop = "downloadShp(layerMenu.layer.id)"
      >
        <bar-loader :loading = "layerMenu.loading.shp"/>
        <span
          class  = "menu-icon skin-color-dark"
          :class = "g3wtemplate.getFontClass('shapefile')">
        </span>
        <span
          class = "item-text"
          v-t   = "'sdk.catalog.menu.download.shp'">
        </span>
      </div>
    </li>

    <!-- Download as GPX -->
    <li
      v-if = "canDownloadGpx(layerMenu.layer.id)"
    >
      <div
        @click.prevent.stop = "downloadGpx(layerMenu.layer.id)"
        v-download
      >
        <bar-loader :loading = "layerMenu.loading.gpx"/>
        <span
          class  = "menu-icon skin-color-dark"
          :class = "g3wtemplate.getFontClass('gpx')">
        </span>
        <span
          class = "item-text"
          v-t   = "'sdk.catalog.menu.download.gpx'">
        </span>
      </div>
    </li>

    <!-- Download as Gpkg -->
    <li
      v-if = "canDownloadGpkg(layerMenu.layer.id)"
    >
      <div
        @click.prevent.stop = "downloadGpkg(layerMenu.layer.id)"
        v-download
      >
        <bar-loader :loading = "layerMenu.loading.gpkg"/>
        <span
          class  = "menu-icon skin-color-dark"
          :class = "g3wtemplate.getFontClass('gpkg')">
        </span>
        <span
          class = "item-text"
          v-t   = "'sdk.catalog.menu.download.gpkg'">
        </span>
      </div>
    </li>

    <!-- Download as CSV -->
    <li
      v-if = "canDownloadCsv(layerMenu.layer.id)"
    >
      <div
        @click.prevent.stop = "downloadCsv(layerMenu.layer.id)"
        v-download
      >
        <bar-loader :loading = "layerMenu.loading.csv" />
        <span
          class  = "menu-icon skin-color-dark"
          :class = "g3wtemplate.getFontClass('csv')">
        </span>
        <span
          class = "item-text"
          v-t   = "'sdk.catalog.menu.download.csv'">
        </span>
      </div>
    </li>

    <!-- Download as XLS -->
    <li
      v-if = "canDownloadXls(layerMenu.layer.id)"
      v-download
    >
      <div
        @click.prevent.stop = "downloadXls(layerMenu.layer.id)"
      >
        <bar-loader :loading = "layerMenu.loading.xls"/>
        <span
          class  = "menu-icon skin-color-dark"
          :class = "g3wtemplate.getFontClass('xls')">
        </span>
        <span
          class = "item-text"
          v-t   = "'sdk.catalog.menu.download.xls'">
        </span>
      </div>
    </li>

    <!-- Filters menu -->
    <li
      v-if             = "canShowFiltersMenu(layerMenu.layer)"
      @mouseleave.self = "showSubMenuContext({ menu: 'filtersMenu', bool: false, evt: $event })"
      @mouseover.self  = "showSubMenuContext({ menu: 'filtersMenu', bool: true, evt: $event })"
      class            = "menu-icon"
    >
      <span class = "menu-icon skin-color-dark" :class = "g3wtemplate.getFontClass('filter')"></span>
      <span class = "item-text" v-t = "'catalog_items.contextmenu.filters'"></span>
      <span class = "menu-icon" style = "position: absolute; right: 0; margin-top: 3px" :class = "g3wtemplate.getFontClass('arrow-right')"></span>
      <ul
        v-show = "layerMenu.filtersMenu.show"
        style  = "position:fixed; padding-left: 0; background-color: #FFFFFF; color:#000000"
        :style = "{
          top:       layerMenu.filtersMenu.top       + 'px',
          left:      layerMenu.filtersMenu.left      + 'px',
          maxHeight: layerMenu.filtersMenu.maxHeight + 'px',
          overflowY: layerMenu.filtersMenu.overflowY
        }"
      >
        <li
          v-for       = "filter in layerMenu.layer.filters"
          :key        = "filter.fid"
          style       = "display: flex; justify-content: space-between; align-items: baseline"
          @click.stop = "setCurrentLayerFilter(filter)"
        >
          <span
            v-if   = "layerMenu.layer.filter.current && layerMenu.layer.filter.current.fid === filter.fid"
            style  = "font-size: 0.5em; margin-right: 3px;justify-self: flex-start"
            :class = "g3wtemplate.getFontClass('circle')"
          ></span>
            <span style = "margin-right: 5px;">{{ filter.name }}</span>
            <span
              @click.stop = "deleteFilter(filter.fid)"
              class       = "skin-border-color"
              style       = "color: red; right: 0; padding-left: 10px; border-left: 2px solid;"
              :class      = "g3wtemplate.getFontClass('trash')">
          </span>
        </li>
      </ul>
    </li>

    <!-- Click to Copy WMS URL -->
    <li
      v-if = "canShowWmsUrl(layerMenu.layer.id)"
    >
      <div
        @click.prevent.stop = "copyUrl({evt: $event, layerId:layerMenu.layer.id, type:'Wms'})"
        style               = "display: flex; max-width:300px; align-items: center;"
      >
        <span
          class  = "menu-icon skin-color-dark"
          :class = "g3wtemplate.getFontClass('map')">
        </span>
        <div style = "display: inline-flex; justify-content: space-between; width: 100%; align-items: baseline">
          <span
            class          = "item-text catalog-menu-wms skin-tooltip-top"
            data-toggle    = "tooltip"
            data-container = "body"
            v-t-tooltip    = "'sdk.catalog.menu.wms.copy'">WMS URL</span>
          <span
            class          = "bold catalog-menu-wms wms-url-tooltip skin-tooltip-top skin-color-dark"
            :class         = "g3wtemplate.getFontClass('eye')"
            data-placement = "top"
            data-toggle    = "tooltip"
            data-container = "body"
            :title         = "getWmsUrl(layerMenu.layer.id)"
          ></span>

        </div>

      </div>

    </li>

    <!-- Click to Copy WFS URL -->
    <li v-if = "canShowWfsUrl(layerMenu.layer.id)">
      <div
        @click.prevent.stop = "copyUrl({evt: $event, layerId:layerMenu.layer.id, type:'Wfs'})"
        style               = "display: flex; max-width:300px; align-items: center;"
      >
        <span
          class  = "menu-icon skin-color-dark"
          :class = "g3wtemplate.getFontClass('map')">
        </span>
        <div style = "display: inline-flex; justify-content: space-between; width: 100%; align-items: baseline"
        >
          <span
            class          = "item-text catalog-menu-wms skin-tooltip-top"
            data-toggle    = "tooltip"
            data-container = "body"
            v-t-tooltip    = "'sdk.catalog.menu.wms.copy'">WFS URL</span>
          <span
            class          = "bold catalog-menu-wms wms-url-tooltip skin-tooltip-top skin-color-dark"
            :class         = "g3wtemplate.getFontClass('eye')"
            data-placement = "top"
            data-toggle    = "tooltip"
            data-container = "body"
            :title         = "getWfsUrl(layerMenu.layer.id)"
          ></span>

        </div>

      </div>

    </li>

    <!-- Click to Copy WFS 3 URL @since 3.10.0 -->
    <li
      v-if = "canShowWfsUrl(layerMenu.layer.id)"
    >
      <div
        @click.prevent.stop = "copyUrl({evt: $event, layerId:layerMenu.layer.id, type:'Wfs3'})"
        style               = "display: flex; max-width:300px; align-items: center;"
        >
      <span
        class  = "menu-icon skin-color-dark"
        :class = "g3wtemplate.getFontClass('map')">
      </span>
        <div style = "display: inline-flex; justify-content: space-between; width: 100%; align-items: baseline">
          <span
            class          = "item-text catalog-menu-wms skin-tooltip-top"
            data-toggle    = "tooltip"
            data-container = "body"
            v-t-tooltip    = "'sdk.catalog.menu.wms.copy'">WFS 3 URL</span>
          <span
            class           = "bold catalog-menu-wms wms-url-tooltip skin-tooltip-top skin-color-dark"
            :class          ="g3wtemplate.getFontClass('eye')"
            data-placement  = "top"
            data-toggle     = "tooltip"
            data-container  = "body"
            :title          = "getWfs3Url(layerMenu.layer.id)"
          ></span>
        </div>

      </div>

    </li>

    <!-- Click to open G3W-ADMIN's project layers page -->
    <li v-if = "layers_url">
      <div>
        <!-- TODO: g3wtemplate.getFontClass('qgis') -->
        <span class = "menu-icon skin-color-dark">
          <svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 32 32" style="height: 14px; vertical-align: -1.5px; fill: currentColor;">
            <path d="m17.61 17.63 4.36-.02-4-3.98h-4.36v4l4 4.45z"/>
            <path d="m31.61 27.22-7.62-7.6-4.38.01v4.33l7.24 7.67h4.76z"/>
            <path d="M18 25.18c-.68.16-1.17.2-1.9.2a9.77 9.77 0 0 1-9.68-9.88c0-5.57 4.4-9.78 9.68-9.78s9.48 4.2 9.48 9.78c0 .91-.15 1.96-.36 2.8l4.88 4.65a15 15 0 0 0 1.95-7.48C32.05 6.87 25.19.44 16 .44 6.86.44 0 6.84 0 15.47c0 8.68 6.86 15.2 16 15.2 2.36 0 4.23-.3 6.2-1.1L18 25.18z"/>
          </svg>
        </span>
        <b><a :href = "layers_url" target = "_blank" style = "color: initial">Layers settings</a></b>
      </div>
    </li>

  </ul>
</template>

<script>
  import { Chrome as ChromeComponent } from 'vue-color';

  import LayerOpacityPicker            from 'components/LayerOpacityPicker.vue';

  import { VM }                        from 'g3w-eventbus';
  import ApplicationState              from 'store/application';
    import GUI                           from 'services/gui';
  import { downloadFile }              from 'utils/downloadFile';
  import { getCatalogLayerById }       from 'utils/getCatalogLayerById';

  const { t }                        = require('g3w-i18n');
  const shpwrite                     = require('shp-write');

  const OFFSETMENU  = { top: 50, left: 15 };

  export default {
    name: 'catalog-context-menu',

    props: {
      external: {
        type: Object
      }
    },

    data() {
      return {
        menu: {
          title:  ApplicationState.project.getName(),
          show:   false,
          top:    0,
          left:   0,
          //layers
          layers: {
            show: false,
            top:  0,
            left: 0
          }
        },
        layerMenu: {
          show:    false,
          top:     0,
          left:    0,
          tooltip: false,
          name:    '',
          layer:   null,
          loading: {
            shp:  false,
            csv:  false,
            gpx:  false,
            gpkg: false,
            xls:  false,
          },
          // colorMenu
          colorMenu: {
            show:  false,
            top:   0,
            left:  0,
            color: null
          },
          // styleMenu
          stylesMenu: {
            show:    false,
            top:     0,
            left:    0,
            style:   null,
            default: null
          },
          //filtersMenu
          filtersMenu: {
            show:    false,
            top:     0,
            left:    0,
            style:   null,
            default: null
          },
          // metadataInfo
          metadatainfoMenu: {
            show: false,
            top:  0,
            left: 0
          },
        },
      };
    },

    computed: {

      edit_url() {
        return ApplicationState.project.getState().edit_url;
      },

      layers_url() {
        return ApplicationState.project.getState().layers_url;
      },

    },

    components: {
      'chrome-picker':        ChromeComponent,
      'layer-opacity-picker': LayerOpacityPicker,
    },

    methods: {

      __hideMenu() {
        this.menu.show = false;
      },

      showAdminLayers() {},

      async onShowProjectContextMenu(evt) {
        this.__hideMenu();
        await this.$nextTick();
        this.menu.left = evt.x;
        this.menu.show = true;
        await this.$nextTick();
        this.menu.top = $(evt.target).offset().top - $(this.$refs['project-context-menu']).height() + ($(evt.target).height() / 2);
      },

      /**
       * @TODO find out a better way to handle this, eg:
       *       using only the `showSubMenuContext()` method
       */
      addLayerMenuItem(item = {}) {
        this.layerMenu = ({ ...this.layerMenu, ...item });
      },

      /**
       * @private
       */
      _hideMenu() {
        this.layerMenu.show            = false;
        this.layerMenu.styles          = false;
        this.layerMenu.loading.shp     = false;
        this.layerMenu.loading.csv     = false;
        this.layerMenu.loading.gpx     = false;
        this.layerMenu.loading.gpkg    = false;
        this.layerMenu.loading.xls     = false;
        this.layerMenu.loading.geotiff = false;
        /**
         * @since 3.8.3
         * @type {boolean}
         */
        this.layerMenu.loading.unknow = false;
      },

      /**
       *
        * @param menu
       */
      closeLayerMenu(menu = {}) {
        this._hideMenu();
        this.showColorMenu(false);
        menu.show = false;
      },

      onbeforeDestroyChangeColor() {
        this.$refs.color_picker.$off();
      },

      onChangeColor(val) {
        const map                  = GUI.getService('map');
        this.layerMenu.layer.color = val;
        const layer                = map.getLayerByName(this.layerMenu.name);
        const style                = layer.getStyle();
        style._g3w_options.color   = val;

        layer.setStyle(style);
      },

      canShowWmsUrl(layerId) {
        const originalLayer = getCatalogLayerById(layerId);
        return originalLayer ? (!!(!originalLayer.isType('table') && originalLayer.getFullWmsUrl())) : false;
      },

      canShowWfsUrl(layerId) {
        const originalLayer = getCatalogLayerById(layerId);
        return originalLayer && !originalLayer.isType('table') && originalLayer.isWfsActive();
      },

      canDownloadXls(layerId) {
        const layer = getCatalogLayerById(layerId);
        return layer ? layer.isXlsDownlodable() : false;
      },

      canDownloadGpx(layerId) {
        const layer = getCatalogLayerById(layerId);
        return layer ? layer.isGpxDownlodable() : false;
      },

      canDownloadGpkg(layerId) {
        const layer = getCatalogLayerById(layerId);
        return layer ? layer.isGpkgDownlodable() : false;
      },

      canDownloadCsv(layerId) {
        const layer = getCatalogLayerById(layerId);
        return layer ? layer.isCsvDownlodable() : false;
      },

      canDownloadGeoTIFF(layerId) {
        const layer = getCatalogLayerById(layerId);
        return layer ? layer.isGeoTIFFDownlodable() : false;
      },

      canDownloadShp(layerId) {
        const layer = getCatalogLayerById(layerId);
        return layer ? layer.isShpDownlodable() : false;
      },

      getWmsUrl(layerId) {
        return getCatalogLayerById(layerId).getCatalogWmsUrl();
      },

      getWfsUrl(layerId) {
        return getCatalogLayerById(layerId).getCatalogWfsUrl();
      },

      /**
       * @since 3.10.0
       * @param layerId
       * @return { String } wfs3 url
       */
      getWfs3Url(layerId) {
        return getCatalogLayerById(layerId).getCatalogWfs3Url();
      },

      /**
       *
        * @param evt
       * @param layerId
       * @param { String } type Wms, Wfs, Wfs3
       */
      copyUrl({ evt, layerId, type } = {}) {
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
        setTimeout(() => {
          //remove tooltip
          $('[data-toggle="tooltip"]').tooltip("destroy");
          this._hideMenu()
        }, 600);
      },

      downloadGeoTIFF(layerId, map_extent=false) {
        ApplicationState.download = true;
        this.layerMenu.loading.geotiff = true;
        const layer = getCatalogLayerById(layerId);
        layer.getGeoTIFF({
          data:  map_extent ? {
            map_extent: GUI.getService('map').getMapExtent().toString()
          } : undefined
        })
          .catch(err => GUI.notify.error(t("info.server_error")))
          .finally(() => {
            this.layerMenu.loading.geotiff = false;
            ApplicationState.download = false;
            this._hideMenu();
          })
      },

      downloadShp(layerId) {
        ApplicationState.download = true;
        this.layerMenu.loading.shp = true;
        const layer = getCatalogLayerById(layerId);
        layer.getShp()
          .catch(err => GUI.notify.error(t("info.server_error")))
          .finally(() => {
            this.layerMenu.loading.shp = false;
            ApplicationState.download = false;
            this._hideMenu();
          })
      },

      downloadCsv(layerId) {
        ApplicationState.download = true;
        this.layerMenu.loading.csv = true;
        const layer = getCatalogLayerById(layerId);
        layer.getCsv()
          .catch(err => GUI.notify.error(t("info.server_error")))
          .finally(() => {
            this.layerMenu.loading.csv = false;
            ApplicationState.download = false;
            this._hideMenu();
          })
      },

      downloadXls(layerId) {
        ApplicationState.download = true;
        this.layerMenu.loading.xls = true;
        const layer = getCatalogLayerById(layerId);
        layer.getXls()
          .catch(err => GUI.notify.error(t("info.server_error")))
          .finally(() => {
            this.layerMenu.loading.xls = false;
            ApplicationState.download = false;
            this._hideMenu();
          })
      },

      downloadGpx(layerId) {
        ApplicationState.download = true;
        this.layerMenu.loading.gpx = true;
        const layer = getCatalogLayerById(layerId);
        layer.getGpx()
          .catch(err => GUI.notify.error(t("info.server_error")))
          .finally(() => {
            this.layerMenu.loading.gpx = false;
            ApplicationState.download = false;
            this._hideMenu();
          })
      },

      downloadGpkg(layerId) {
        ApplicationState.download = true;
        this.layerMenu.loading.gpkg = true;
        const layer = getCatalogLayerById(layerId);
        layer.getGpkg()
          .catch(err => GUI.notify.error(t("info.server_error")))
          .finally(() => {
            this.layerMenu.loading.gpkg = false;
            ApplicationState.download = false;
            this._hideMenu();
          })
      },

      changeLayerMapPosition({position, layer}) {
        const changed = layer.position !== position;
        if (!changed) {
          return;
        }
        layer.position = position;
        position = undefined !== position ? position : 'top';
        const map = GUI.getService('map');
        switch(position) {
          case 'top':    layer.setZIndex(map.layersCount); break;
          case 'bottom': layer.setZIndex(0); break
        }
        map.emit('change-layer-position-map', { id, position });
        this._hideMenu();
      },

      setWMSOpacity({id=this.layerMenu.layer.id, value:opacity}) {
        id = undefined !== id ? id : this.layerMenu.layer.id;
        opacity = undefined !== opacity ? opacity : 1;
        this.layerMenu.layer.opacity = opacity;
        const map = GUI.getService('map');
        const layer = map.getLayerById(id);
        if (layer) {
          layer.setOpacity(opacity);
          map.emit('change-layer-opacity', { id, opacity });
        }
      },

      /**
       * @TODO refactor this, almost the same as: `CatalogTristateTree.vue::zoomToLayer(layer))`
       *
       * @FIXME add description
       *
       * @param layer
       */
      zoomToLayer(layer) {
        try {
          GUI
            .getService('map')
            .goToBBox(
              [layer.bbox.minx, layer.bbox.miny, layer.bbox.maxx, layer.bbox.maxy],
              layer.epsg
            );

        } catch(e) {
          console.warn(e);
          GUI.showUserMessage({
            type:        'alert',
            message:     `${e.message}`,
            textMessage: true,
          })
        }
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

      getGeometryType(layerId, external=false) {
        let geometryType;
        if (external) {
          const layer = GUI.getService('catalog').state.external.vector.find(layer => layer.id === layerId);
          if (layer) geometryType = layer.geometryType;
        } else {
          const originalLayer = getCatalogLayerById(layerId);
          geometryType = originalLayer.config.geometrytype;
        }
        geometryType = geometryType && geometryType !== 'NoGeometry' ? geometryType : '' ;
        return geometryType;
      },

      /**
       * External download url
       * 
       * @since 3.8.3
       */
      downloadExternal(url) {
        this.layerMenu.loading.unknow = true;
        downloadFile({ url });
        this.layerMenu.loading.unknow = false;
      },

      /**
       * Create a Geojson file from vector OL vector layer and download it in shapefile with WGS84 Projection
       * 
       * @param layer
       * @returns {Promise<void>}
       */
      async downloadExternalShapefile(layer) {
        const EPSG4326 = 'EPSG:4326';
        this.layerMenu.loading.shp = true;
        let features = GUI.getService('map').getLayerByName(layer.name).getSource().getFeatures();
        if (EPSG4326 !== layer.crs) {
          features = features.map(feature => {
            const clonefeature = feature.clone();
            clonefeature.getGeometry().transform(layer.crs, EPSG4326);
            return clonefeature;
          })
        }
        const name = layer.name.split(`.${layer.type}`)[0];
        shpwrite.download(
          // GeoJSONFile
          (new ol.format.GeoJSON()).writeFeaturesObject(features, { featureProjection: EPSG4326 }),
          {
            folder:         name,
            types: {
              point:        name,
              mulipoint:    name,
              polygon:      name,
              multipolygon: name,
              line:         name,
              polyline:     name,
              multiline:    name,
            }
          }
        );
        await this.$nextTick();
        this.layerMenu.loading.shp = false;
        this._hideMenu();
      },

      showAttributeTable(layerId) {
        getCatalogLayerById(layerId).openAttributeTable();
        this._hideMenu();
      },

      setCurrentLayerStyle(index) {
        let changed = false;
        this.layerMenu.layer.styles.forEach((style, idx) => {
          if (idx === index) {
            this.layerMenu.stylesMenu.style = style.name;
            changed = !style.current;
            style.current = true;
          } else {
            style.current = false;
          }
        });
        if (changed) {
          const layerId = this.layerMenu.layer.id;
          const layer   = getCatalogLayerById(layerId);
          if (layer) {
            VM.$emit('layer-change-style', {
              layerId,
              style: this.layerMenu.stylesMenu.style
            });
            layer.change();
          }
        }
        this.closeLayerMenu(this.layerMenu.stylesMenu);
      },

      /**
       * Set current filter
       *
       * @param filter
       *
       * @since 3.9.0
       */
      async setCurrentLayerFilter(filter) {
        const changed = (
          null === this.layerMenu.layer.filter.current ||
          this.layerMenu.layer.filter.current.fid !== filter.fid
        );
        const layer = getCatalogLayerById(this.layerMenu.layer.id);
        if (changed) {
          await layer.applyFilter(filter);
        } else {
          await layer.deleteFilterToken();
        }
        layer.change();
        this.closeLayerMenu(this.layerMenu.filtersMenu);
      },

      /**
       * Delete filter from saved filters
       *
       * @param fid
       *
       * @returns { Promise<void> }
       *
       * @since 3.9.0
       */
      async deleteFilter(fid) {
        const layer  = getCatalogLayerById(this.layerMenu.layer.id);
        const change = fid === this.layerMenu.layer.fid;
        // skip when ..
        if (!layer) { return }
        await layer.deleteFilterToken(fid);
        if (change) { layer.change() }

        this.closeLayerMenu(this.layerMenu.filtersMenu);
      },

      /**
       * Context menu: toggle "styles" submenu handling its correct horizontal and vertical alignment
       */
      async showSubMenuContext({ menu, bool, evt }) {
        if ('string' === typeof menu) {
          menu = this.layerMenu[menu];
        }
        /** @TODO rename parameter: `bool` --> `show` */
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
       * 
       * @since 3.10.0
       */
      async showStylesMenu(bool, evt) {
        this.showSubMenuContext({ bool, evt, menu: this.layerMenu.stylesMenu });
      },

      /**
       * Show metadata info
       */
      async showMetadataInfo(bool, evt) {
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
      },

      /**
       * @since 3.10.0
       */
      async onShowLayerContextMenu (layerstree, evt) {
        this._hideMenu();
        await this.$nextTick();
        this.layerMenu.left            = evt.x;
        this.layerMenu.name            = layerstree.name;
        this.layerMenu.layer           = layerstree;
        this.layerMenu.show            = true;
        this.layerMenu.colorMenu.color = layerstree.color;

        await this.$nextTick();
        this.layerMenu.top = $(evt.target).offset().top - $(this.$refs['layer-menu']).height() + ($(evt.target).height()/ 2);
        $('.catalog-menu-wms[data-toggle="tooltip"]').tooltip();
      },

      /**
       * @since 3.10.0
       */
      canOpenAttributeTable(layer) {
        return layer.openattributetable;
      },

      /**
       * @since 3.10.0
       */
      isExternalLayer(layer) {
        return !layer.projectLayer
      },

      /**
       * Get category style name eventually suffixed by "(default)" string
       * 
       * @since 3.8.0
       */
      getStyleName(style) {
        return style.name + (
          style.name === this.layerMenu.layer.defaultstyle && this.layerMenu.layer.styles.length > 1
            ? ` (${t('default')})`
            : ''
          );
      },

      /**
       * @since 3.8.3
       */
      isExternalWMSLayer(layer) {
        return !layer.projectLayer && 'wms' === layer._type;
      },

      /**
       * @since 3.8.3
       */
       isExternalVectorLayer(layer) {
        return !layer.projectLayer && 'wms' !== layer._type;
      },

      /**
       * @since 3.8.3
       */
      canShowStylesMenu(layer) {
        return layer.geolayer && layer.styles && layer.styles.length > 1;
      },

      /**
       * @returns { boolean } whether it can show filters menu
       *
       * @since 3.9.0
       */
      canShowFiltersMenu(layer) {
        return layer.filters && layer.filters.length > 0;
      },

      /**
       * @since 3.8.3
       */
      hasMetadataInfo(layer) {
        return layer.metadata && layer.metadata.abstract;
      },

      /**
       * @since 3.8.3
       */
      canShowOpacityPicker(layer) {
        return layer.geolayer && layer.visible;
      },

    },

    /**
     * @listens VM~show-project-context-menu
     * @listens VM~hide-project-context-menu
     * 
     * @listens VM~show-layer-context-menu
     * @listens VM~hide-layer-context-menu
     */
    created() {
      VM.$on('show-project-context-menu', this.onShowProjectContextMenu);
      VM.$on('hide-project-context-menu', this.__hideMenu);

      VM.$on('show-layer-context-menu', this.onShowLayerContextMenu );
      VM.$on('hide-layer-context-menu', this._hideMenu)
    },

  };
</script>

<style>
  .catalog-context-menu {
    background: #FAFAFA;
    border: 1px solid #BDBDBD;
    border-radius: 3px;
    display: block;
    list-style: none;
    margin: 0;
    padding: 0;
    position: fixed;
    min-width: 150px;
    z-index: 999999;
    color: #000;
    outline: none;
  }
  .catalog-context-menu li {
    border-bottom: 1px solid #E0E0E0;
    margin: 0;
    padding: 5px 15px;
  }
  .catalog-context-menu li span.menu-icon {
    padding-right: 3px;
    margin-right: 3px;
  }
  .catalog-context-menu li .wms-url-tooltip {
    color: #000;
    opacity: 1;
  }
  .catalog-context-menu li .wms-url-tooltip:hover {
    color: #FFF !important;
    transform: scale(1.1);
  }
  .catalog-context-menu li.title {
    background: transparent;
    font-size: 1.1em;
    font-weight: bold;
    border-bottom-width: 3px !important;
  }
  .catalog-context-menu li.title:hover {
    cursor: default !important;
    background: transparent !important;
    color: #000;
  }
  .catalog-context-menu li:last-child {
    border-bottom: none;
  }
  .catalog-context-menu li:hover {
    color: #FAFAFA;
    cursor: pointer;
  }
  .catalog-context-menu li .layer-menu-metadata-info {
    padding: 5px;
    max-width: 200px;
    white-space: normal;
    overflow-y: auto;
    max-height: 150px;
  }
  .catalog-context-menu .wms-url-tooltip .tooltip-inner {
    min-width: 200px;
  }
  .catalog-context-menu .tooltip-inner {
    word-break: break-all;
    font-weight: bold;
  }
  .catalog-context-menu .item-text {
    margin-left: 3px;
  }
  .catalog-context-menu li .item-text{
    font-weight: bold;
  }
  .catalog-context-menu ul, .catalog-context-menu li {
    list-style-type: none;
  }
  #project-context-menu {
    background: #FAFAFA;
    border: 1px solid #BDBDBD;
    border-radius: 3px;
    display: block;
    list-style: none;
    margin: 0;
    padding: 0;
    position: fixed;
    min-width: 150px;
    z-index: 999999;
    color:#000000;
    outline: none;
  }

</style>
