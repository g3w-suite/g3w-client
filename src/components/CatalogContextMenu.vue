<!--
  @file
  @since v3.11.0
-->

<template>
  <ul
    v-if            =  "layer_menu || (project_menu && edit_url)"
    id              = "layer-context-menu"
    ref             = "menu"
    class           = "catalog-context-menu"
    v-click-outside = "closeMenu"
    tabindex        = "-1"
    :style          = "{
      top:  top + 'px',
      left: left + 'px',
    }"
  >

    <!-- MENU NAME -->
    <li class = "title">
      <div v-if = "project_menu">G3W-ADMIN {{ ApplicationState.project.getName() }}</div>
      <div v-else>
        {{ layer.title }}
        <div style = "font-weight: normal; font-size: 0.8em">
          {{ getGeometryType(layer.id, layer.external) }}
        </div>
      </div>
    </li>

    <!-- LAYER MENU -->
    <template v-if = "layer_menu">

      <!-- Change z-index of ol layer. On top or button -->
      <li v-if = "isExternalLayer(layer)">
        <div style = "display: flex; justify-content: space-between; align-items: center">
          <layerspositions
            @layer-position-change = "changeLayerMapPosition({ position: $event, layer })"
            style                  = "display: flex; flex-direction: column; justify-content: space-between"
            :position              = "layer.position"
          />
        </div>
      </li>

      <!-- Layer Metadata -->
      <li
        v-if             = "hasMetadataInfo(layer)"
        @mouseover.self  = "showMenu($event.target)"
      >
        <span :class = "'menu-icon ' + g3wtemplate.getFontClass('info')"></span>
        <b class = "item-text" v-t = "'Metadata'"></b>
        <ul style = "border-radius: 0 3px 3px 0;">
          <li class = "layer-menu-metadata-info" v-html = "layer.metadata.abstract"></li>
        </ul>
      </li>

      <!-- Zoom to Layer -->
      <li
        v-if                = "canZoom(layer)"
        @click.prevent.stop = "zoomToLayer(layer)"
      >
        <span :class = "'menu-icon ' + g3wtemplate.getFontClass('search')"></span>
        <b    class  = "item-text" v-t = "'catalog_items.contextmenu.zoomtolayer'"></b>
      </li>

      <!-- Attribute Table -->
      <li
        v-if                = "canOpenAttributeTable(layer)"
        @click.prevent.stop = "showAttributeTable(layer.id)"
      >
        <span :class = "'menu-icon ' + g3wtemplate.getFontClass('list')"></span>
        <b class  = "item-text" v-t = "'catalog_items.contextmenu.open_attribute_table'"></b>
      </li>

      <!-- Styles menu -->
      <li
        v-if             = "canShowStylesMenu(layer)"
        @mouseover.self  = "showMenu($event.target)"
      >
        <span :class = "'menu-icon ' + g3wtemplate.getFontClass('palette')"></span>
        <b     class = "item-text" v-t = "'catalog_items.contextmenu.styles'"></b>
        <span :class = "'menu-icon ' + g3wtemplate.getFontClass('arrow-right')" style  = "position: absolute; right: 0; margin-top: 3px"></span>
        <ul>
          <li
            v-for       = "(style, i) in layer.styles"
            @click.stop = "setCurrentLayerStyle(i)"
            :key        = "style.name"
            style       = "display: list-item;"
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
        v-if             = "canShowOpacityPicker(layer)"
        @mouseover.self  = "showMenu($event.target)"
        style            = "padding-right: 0"
      >
        <span :class = "'menu-icon ' + g3wtemplate.getFontClass('slider')"></span>
        <b    class = "item-text" v-t = "'catalog_items.contextmenu.layer_opacity'"></b>
        <span class = "menu-icon" style = "position: absolute; right: 0; margin-top: 3px" :class = "g3wtemplate.getFontClass('arrow-right')"></span>
        <ul>
          <li>
            <range
              :value        = "layer.opacity"
              :min          = "0"
              :max          = "100"
              :step         = "1"
              :sync         = "false"
              :showValue    = "true"
              :unit         = "'%'"
              @change-range = "setLayerOpacity"
            />
          </li>
        </ul>
      </li>

      <!-- Change opacity (external wms layer) -->
      <li
        v-if                = "isExternalWMSLayer(layer)"
        @click.prevent.stop = ""
      >
        <div style = "display: flex; justify-content: space-between">
          <b class = "item-text" v-t = "'sdk.catalog.menu.setwmsopacity'"></b>
          <span style = "font-weight: bold; margin-left: 5px;">{{ layer.opacity }}</span>
        </div>
        <range
          :value        = "layer.opacity"
          :min          = "0"
          :max          = "1"
          :step         = "0.1"
          :sync         = "true"
          @changed      = "closeMenu"
          @change-range = "setWMSOpacity"
        />
      </li>

      <!-- Color picker (external vector layer) -->
      <li
        v-if                = "isExternalVectorLayer(layer)"
        @click.prevent.stop = ""
        @mouseover.self     = "showMenu($event.target)"
      >
        <span :class = "'menu-icon ' + g3wtemplate.getFontClass('tint')"></span>
        <b class  = "item-text" v-t   = "'catalog_items.contextmenu.vector_color_menu'"></b>
        <span :class = "'menu-icon ' + g3wtemplate.getFontClass('arrow-right')" style = "position: absolute; right: 0; margin-top: 3px"></span>
        <ul>
          <li style="padding: 14px; background-color: #E0E0E0;">
            <chrome-picker
              ref                 = "color_picker"
              v-model             = "layer_color"
              @click.prevent.stop = ""
              @hook:beforeDestroy = "() => $refs.color_picker.$off()"
              @input              = "onChangeColor"
              style               = "width: 100%"
            />
          </li>
        </ul>
      </li>

      <!-- Filters menu -->
      <li
        v-if             = "canShowFiltersMenu(layer)"
        @mouseover.self  = "showMenu($event.target)"
      >
        <span :class = "'menu-icon ' + g3wtemplate.getFontClass('filter')"></span>
        <b class  = "item-text" v-t = "'catalog_items.contextmenu.filters'"></b>
        <span :class = "'menu-icon ' + g3wtemplate.getFontClass('arrow-right')" style = "position: absolute; right: 0; margin-top: 3px"></span>
        <ul>
          <li
            v-for       = "filter in layer.filters"
            :key        = "filter.fid"
            style       = "display: flex; justify-content: space-between; align-items: baseline"
            @click.stop = "setCurrentLayerFilter(filter)"
          >
            <span
              v-if   = "layer.filter.current && layer.filter.current.fid === filter.fid"
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

      <!-- Click to Download -->
      <li
        v-if             = "canDownload('', layer.id) || isExternalVectorLayer(layer)"
        @mouseover.self  = "showMenu($event.target)"
        :disabled        = "ApplicationState.download"
        style            = "display: list-item;"
      >
        <span :class = "'menu-icon ' + g3wtemplate.getFontClass('download')"></span>
        <b    class  = "item-text" v-t = "'Download'"></b>
        <span :class = "'menu-icon ' + g3wtemplate.getFontClass('arrow-right')" style = "position: absolute; right: 0; margin-top: 3px" ></span>
        <bar-loader :loading = "ApplicationState.download"/>
        <ul>

          <!-- Download as GeoTIFF -->
          <li
            v-if                = "canDownload('GeoTIFF', layer.id)"
            @click.prevent.stop = "download('GeoTIFF', layer.id)"
            v-download
          >
            <span :class = "'menu-icon ' + g3wtemplate.getFontClass('geotiff')"></span>
            <b class  = "item-text" v-t = "'GeoTiff'"></b>
          </li>

          <!-- Download as GeoTIFF -->
          <li
            v-if                = "canDownload('GeoTIFF', layer.id)"
            @click.prevent.stop = "download('GeoTIFF', layer.id, true)"
            v-download
          >
            <span :class = "'menu-icon ' + g3wtemplate.getFontClass('geotiff')" style = "color:#777"></span>
            <span :class = "'menu-icon ' + g3wtemplate.getFontClass('crop')"    style = "position: absolute; left: -7px; bottom: 8px; font-size: 1.2em"></span>
            <b class  = "item-text" v-t = "'sdk.catalog.menu.download.geotiff_map_extent'"></b>
          </li>

          <!-- Download as SHP -->
          <li
            v-if                = "canDownload('Shp', layer.id)"
            @click.prevent.stop = "download('Shp', layer.id)"
            v-download
          >
            <span :class = "'menu-icon ' + g3wtemplate.getFontClass('shapefile')"></span>
            <b class  = "item-text" v-t = "'Shapefile'"></b>
          </li>

          <!-- Download as GPX -->
          <li
            v-if                = "canDownload('Gpx', layer.id)"
            @click.prevent.stop = "download('Gpx', layer.id)"
            v-download
          >
            <span :class = "'menu-icon ' + g3wtemplate.getFontClass('gpx')"></span>
            <b class  = "item-text" v-t = "'GPX'"></b>
          </li>

          <!-- Download as Gpkg -->
          <li
            v-if                = "canDownload('Gpkg', layer.id)"
            @click.prevent.stop = "download('Gpkg', layer.id)"
            v-download
          >
            <span :class = "'menu-icon ' + g3wtemplate.getFontClass('gpkg')"></span>
            <b class  = "item-text" v-t = "'GeoPackage'"></b>
          </li>

          <!-- Download as CSV -->
          <li
            v-if                = "canDownload('Csv', layer.id)"
            @click.prevent.stop = "download('Csv', layer.id)"
            v-download
          >
            <span :class = "'menu-icon ' + g3wtemplate.getFontClass('csv')"></span>
            <b class  = "item-text" v-t = "'CSV'"></b>
          </li>

          <!-- Download as XLS -->
          <li
            v-if = "canDownload('Xls', layer.id)"
            @click.prevent.stop = "download('Xls', layer.id)"
            v-download
          >
            <span :class  = "'menu-icon ' + g3wtemplate.getFontClass('xls')"></span>
            <b class   = "item-text" v-t = "'Excel'"></b>
          </li>

          <!-- Download an external layer file from a proxy server url -->
          <li
            v-if                = "isExternalVectorLayer(layer) && layer.downloadUrl"
            @click.prevent.stop = "downloadExternal(layer.downloadUrl)"
            v-download
          >
            <span :class = "'menu-icon ' + g3wtemplate.getFontClass('download')"></span>
            <b class  = "item-text" v-t   = "'sdk.catalog.menu.download.unknow'"></b>
          </li>

          <!-- Download an external layer file as shapefile -->
          <li
            v-if                = "isExternalVectorLayer(layer) && !layer.downloadUrl"
            @click.prevent.stop = "downloadExternalShapefile(layer)"
            v-download
          >
            <span :class = "'menu-icon ' + g3wtemplate.getFontClass('shapefile')"></span>
            <b class  = "item-text" v-t   = "'Shapefile'"></b>
          </li>

        </ul>
      </li>

      <!-- OGC Service URLs -->
      <li
        v-if             = "canShowWmsUrl(layer.id) || canShowWfsUrl(layer.id) || canShowWfsUrl(layer.id)"
        @mouseover.self  = "showMenu($event.target)"
      >
        <span :class = "'menu-icon ' + g3wtemplate.getFontClass('map')"></span>
        <b    class  = "item-text" v-t = "'Services'"></b>
        <span :class = "'menu-icon ' + g3wtemplate.getFontClass('arrow-right')" style = "position: absolute; right: 0; margin-top: 3px" ></span>
        <ul>

          <!-- Click to Copy WMS URL -->
          <li
            v-if   = "canShowWmsUrl(layer.id)"
            @click = "copyUrl({ el: $event.target, layerId: layer.id, type:'Wms'})"
            style = "display: flex; justify-content: space-between;align-items: baseline;"
          >
            <a
              :href  = "getWmsUrl(layer.id)"
              target = "_blank"
              style  = "color:#000"
            >
              <span :class = "'menu-icon ' + g3wtemplate.getFontClass('map')"></span>
              <b class  = "item-text">WMS URL</b>
            </a>
            <b
              class           = "click-to-copy skin-tooltip-top skin-color-dark"
              :class          ="g3wtemplate.getFontClass('eye')"
              data-placement  = "top"
              data-toggle     = "tooltip"
              data-container  = "body"
              :title          = "getWmsUrl(layer.id)"
            ></b>
          </li>

          <!-- Click to Copy WFS URL -->
          <li
            v-if   = "canShowWfsUrl(layer.id)"
            @click = "copyUrl({ el: $event.target, layerId: layer.id, type:'Wfs' })"
            style = "display: flex; justify-content: space-between;align-items: baseline;"
          >
            <a
              :href  = "getWfsUrl(layer.id)"
              target = "_blank"
              style  = "color:#000"
            >
              <span :class = "'menu-icon ' + g3wtemplate.getFontClass('map')"></span>
              <b class  = "item-text">WFS URL</b>
            </a>
            <b
              class           = "click-to-copy skin-tooltip-top skin-color-dark"
              :class          ="g3wtemplate.getFontClass('eye')"
              data-placement  = "top"
              data-toggle     = "tooltip"
              data-container  = "body"
              :title          = "getWfsUrl(layer.id)"
            ></b>
          </li>

          <!-- Click to Copy WFS 3 URL -->
          <li
            v-if   = "canShowWfsUrl(layer.id)"
            @click = "copyUrl({ el: $event.target, layerId: layer.id, type:'Wfs3' })"
            style  = "display: flex; justify-content: space-between;align-items: baseline;"
          >
            <a
              :href  = "getWfs3Url(layer.id)"
              target = "_blank"
              style  = "color:#000"
            >
              <span :class = "'menu-icon ' + g3wtemplate.getFontClass('map')"></span>
              <b class  = "item-text">WFS 3 URL</b>
            </a>
            <b
              class           = "click-to-copy skin-tooltip-top skin-color-dark"
              :class          ="g3wtemplate.getFontClass('eye')"
              data-placement  = "top"
              data-toggle     = "tooltip"
              data-container  = "body"
              :title          = "getWfs3Url(layer.id)"
            ></b>
          </li>

        </ul>
      </li>

    </template>

    <!-- Click to open G3W-ADMIN's project layers page -->
    <li v-if = "layers_url && layer_menu">
      <a :href = "layers_url" target = "_blank" style = "color: initial">
        <!-- TODO: g3wtemplate.getFontClass('qgis') -->
        <span class = "menu-icon">
          <svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 32 32" style="height: 14px; vertical-align: -1.5px; fill: currentColor;">
            <path d="m17.61 17.63 4.36-.02-4-3.98h-4.36v4l4 4.45z"/>
            <path d="m31.61 27.22-7.62-7.6-4.38.01v4.33l7.24 7.67h4.76z"/>
            <path d="M18 25.18c-.68.16-1.17.2-1.9.2a9.77 9.77 0 0 1-9.68-9.88c0-5.57 4.4-9.78 9.68-9.78s9.48 4.2 9.48 9.78c0 .91-.15 1.96-.36 2.8l4.88 4.65a15 15 0 0 0 1.95-7.48C32.05 6.87 25.19.44 16 .44 6.86.44 0 6.84 0 15.47c0 8.68 6.86 15.2 16 15.2 2.36 0 4.23-.3 6.2-1.1L18 25.18z"/>
          </svg>
        </span>
        <b>Layers settings</b>
        <span :class = "'menu-icon ' + g3wtemplate.getFontClass('external-link')" style  = "position: absolute; right: 0; margin-top: 3px"></span>
      </a>
    </li>

    <!-- Click to open G3W-ADMIN's project page -->
    <li v-if = "edit_url && project_menu">
      <a :href = "edit_url" @click.stop = "closeMenu" target = "_blank" style = "color: initial">
        <!-- TODO: g3wtemplate.getFontClass('qgis') -->
        <span class = "menu-icon">
          <svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 32 32" style="height: 14px; vertical-align: -1.5px; fill: currentColor;">
            <path d="m17.61 17.63 4.36-.02-4-3.98h-4.36v4l4 4.45z"/>
            <path d="m31.61 27.22-7.62-7.6-4.38.01v4.33l7.24 7.67h4.76z"/>
            <path d="M18 25.18c-.68.16-1.17.2-1.9.2a9.77 9.77 0 0 1-9.68-9.88c0-5.57 4.4-9.78 9.68-9.78s9.48 4.2 9.48 9.78c0 .91-.15 1.96-.36 2.8l4.88 4.65a15 15 0 0 0 1.95-7.48C32.05 6.87 25.19.44 16 .44 6.86.44 0 6.84 0 15.47c0 8.68 6.86 15.2 16 15.2 2.36 0 4.23-.3 6.2-1.1L18 25.18z"/>
          </svg>
        </span>
        <b>Project settings</b>
        <span :class = "'menu-icon ' + g3wtemplate.getFontClass('external-link')" style  = "position: absolute; right: 0; margin-top: 3px"></span>
      </a>
  </li>

  </ul>
</template>

<script>
  import { Chrome as ChromeComponent } from 'vue-color';

  import { VM }                        from 'g3w-eventbus';
  import ApplicationState              from 'store/application';
  import GUI                           from 'services/gui';
  import { downloadFile }              from 'utils/downloadFile';
  import { getCatalogLayerById }       from 'utils/getCatalogLayerById';

  const { t }                        = require('g3w-i18n');
  const shpwrite                     = require('shp-write');

  export default {
    name: 'catalog-context-menu',

    props: {
      external: {
        type: Object
      }
    },

    data() {
      return {
        ApplicationState,
        layer:         null,
        layer_style:   null,
        layer_color:   null,
        top:           0,
        left:          0,
        project_menu:  false,
        layer_menu:    false,
        metadata_menu: false,
        styles_menu:   false,
        opacity_menu:  false,
        download_menu: false,
        ogc_menu:      false,
        color_menu:    false,
        filters_menu:  false,
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
      'chrome-picker': ChromeComponent,
    },

    methods: {

      /**
       * @since 3.10.0
       */
       async onShowLayerContextMenu(evt, layerstree) {
        this.closeMenu();
        await this.$nextTick();
        this.left        = evt.x;
        this.layer       = layerstree;
        this.layer_menu  = true;
        this.layer_color = layerstree.color;

        await this.$nextTick();
        this.top = $(evt.target).offset().top - $(this.$refs['menu']).height() + ($(evt.target).height()/ 2);
        $('.click-to-copy[data-toggle="tooltip"]').tooltip();
      },

      async onShowProjectContextMenu(evt) {
        this.closeMenu();
        await this.$nextTick();
        this.left         = evt.x;
        this.project_menu = true;
        console.log(this.project_menu, this);
        await this.$nextTick();
        this.top = $(evt.target).offset().top - $(this.$refs['project-context-menu']).height() + ($(evt.target).height() / 2);
      },

      /**
       * @param { string } menu
       */
      closeMenu() {
        this.layer_menu = false;
        this.project_menu = false;
      },

      onChangeColor(val) {
        this.layer.color         = val;
        const layer              = GUI.getService('map').getLayerByName(this.layer.name || '');
        const style              = layer.getStyle();
        style._g3w_options.color = val;
        layer.setStyle(style);
      },

      canShowWmsUrl(layerId) {
        const layer = getCatalogLayerById(layerId);
        return layer && !layer.isType('table') && !!layer.getFullWmsUrl();
      },

      canShowWfsUrl(layerId) {
        const layer = getCatalogLayerById(layerId);
        return layer && !layer.isType('table') && layer.isWfsActive();
      },

      /**
       * @param { string } format
       * @param { string } layerId
       * 
       * @since 3.11.0
       */
      canDownload(format, layerId) {
        const layer = getCatalogLayerById(layerId);
        return layer && layer['is' + format + 'Downloadable']();
      },

      getWmsUrl(layerId) {
        return getCatalogLayerById(layerId).getCatalogWmsUrl();
      },

      getWfsUrl(layerId) {
        return getCatalogLayerById(layerId).getCatalogWfsUrl();
      },

      /**
       * @param layerId
       * @returns { String } wfs3 url
       * 
       * @since 3.10.0
       */
      getWfs3Url(layerId) {
        return getCatalogLayerById(layerId).getCatalogWfs3Url();
      },

      /**
       *
       * @param evt
       * @param layerId
       * @param { string } type Wms, Wfs, Wfs3
       */
      copyUrl({ el, layerId, type } = {}) {
        const url = this[`get${type}Url`](layerId);
        const a = document.createElement('a');
        const input = document.createElement('input');
        a.href = url;
        input.value = a.href;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        $(el).attr('data-original-title', t('sdk.catalog.menu.wms.copied')).tooltip('show');
        $(el).attr('title', this.copywmsurltooltip).tooltip('fixTitle');
        input.remove();
        a.remove();
        setTimeout(() => {
          $('[data-toggle="tooltip"]').tooltip("destroy"); // remove tooltip
          this.closeMenu();
        }, 600);
      },

      /**
       * @param { string } format
       * @param { string } layerId
       * @param { boolean } map_extent
       * @since 3.11.0
       */
      async download(format, layerId, map_extent = false) {
        ApplicationState.download = true;
        try {
          await getCatalogLayerById(layerId)['get' + format]({
            data:  map_extent ? { map_extent: GUI.getService('map').getMapExtent().toString() } : undefined
          });
        } catch (e) {
          GUI.notify.error(t("info.server_error"));
        }
        ApplicationState.download = false;
        this.closeMenu();
      },

      /**
       * External download url
       * 
       * @since 3.8.3
       */
       downloadExternal(url) {
        ApplicationState.download = true;
        downloadFile({ url });
        ApplicationState.download = false;
      },

      /**
       *
        * @param { String } position top, bottom
       * @param { Object }  layer
       */
      changeLayerMapPosition({ position, layer } = {}) {
        const changed = layer.position !== position;
        if (!changed) {
          return;
        }
        layer.position = position;
        position = undefined === position ? 'top' : position;
        const map = GUI.getService('map');
        //get map layer
        const ml = map.getLayerById(layer.id);
        switch(position) {
          case 'top':    ml.setZIndex(map.layersCount); break;
          case 'bottom': ml.setZIndex(0); break
        }
        map.emit('change-layer-position-map', { id: layer.id, position });
        this.closeMenu();
      },

      setWMSOpacity({id=this.layer.id, value:opacity}) {
        id = undefined !== id ? id : this.layer.id;
        opacity = undefined !== opacity ? opacity : 1;
        this.layer.opacity = opacity;
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
        this.closeMenu();
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
        const layer = external ? GUI.getService('catalog').state.external.vector.find(l => l.id === layerId) : getCatalogLayerById(layerId);
        if (layer) {
          const type = external ? layer.geometryType : layer.config.geometrytype;
          return layer && 'NoGeometry' !== type && type || '';
        }
        return '';
      },

      /**
       * Create a Geojson file from vector OL vector layer and download it in shapefile with WGS84 Projection
       * 
       * @param layer
       * @returns {Promise<void>}
       */
      async downloadExternalShapefile(layer) {
        const EPSG4326 = 'EPSG:4326';
        ApplicationState.download = true;
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
        ApplicationState.download = false;
        this.closeMenu();
      },

      showAttributeTable(layerId) {
        getCatalogLayerById(layerId).openAttributeTable();
        this.closeMenu();
      },

      setCurrentLayerStyle(index) {
        let changed = false;
        this.layer.styles.forEach((style, i) => {
          if (i === index) {
            this.layer_style = style.name;
            changed = !style.current;
            style.current = true;
          } else {
            style.current = false;
          }
        });
        const layer = changed && getCatalogLayerById(this.layer.id);
        if (layer) {
          VM.$emit('layer-change-style', { layerId: this.layer.id, style: this.layer_style });
          layer.change();
        }
        this.closeMenu();
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
          null === this.layer.filter.current ||
          this.layer.filter.current.fid !== filter.fid
        );
        const layer = getCatalogLayerById(this.layer.id);
        if (changed) {
          await layer.applyFilter(filter);
        } else {
          await layer.deleteFilterToken();
        }
        layer.change();
        this.closeMenu();
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
        const layer  = getCatalogLayerById(this.layer.id);
        const change = fid === this.layer.fid;
        // skip when ..
        if (!layer) { return }
        await layer.deleteFilterToken(fid);
        if (change) { layer.change() }

        this.closeMenu();
      },

      /**
       * Context menu: toggle "styles" submenu handling its correct horizontal and vertical alignment
       * 
       * @param { string } menu
       * @param { HTMLElement } target
       */
      async showMenu(target) {
        await this.$nextTick();
        const ul = target && target.querySelector('ul');
        if (ul) {
          const overflowY = (ul.offsetHeight + ul.getBoundingClientRect().top) >= (this.$refs['menu'].offsetHeight + this.$refs['menu'].getBoundingClientRect().top);
          ul.style.top       = ul.offsetHeight > this.$refs['menu'].offsetHeight ? 0 : undefined;
          ul.style.left      = this.$refs['menu'].offsetWidth -2 + 'px';
          ul.style.maxHeight = this.$refs['menu'].offsetHeight + 'px';
          ul.style.bottom    = overflowY ? 0         : undefined;
          ul.style.marginTop = overflowY ? undefined : '-5px';
          ul.style.overflowY = 'auto';
        }
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
          style.name === this.layer.defaultstyle && this.layer.styles.length > 1
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

      /**
       * @since 3.11.0
       */
      /**
       * @param {{ id:? string, value: number }}
       * 
       * @fires VM~layer-change-opacity
       */
      setLayerOpacity( { id = this.layer.id, value: opacity }) {
        // skip if nothing has changed
        if (this.layer.opacity == opacity) {
          return;
        }
        this.layer.opacity = opacity;
        const layer = getCatalogLayerById(id);
        if (layer) {
          VM.$emit('layer-change-opacity', { layerId: id });
          layer.change();
        }
      },

    },

    /**
     * @listens VM~show-project-context-menu
     * @listens VM~show-layer-context-menu
     */
    created() {
      VM.$on('show-project-context-menu', this.onShowProjectContextMenu);
      VM.$on('show-layer-context-menu', this.onShowLayerContextMenu );
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
    z-index: 1;
    color: #000;
    outline: none;
    display: flex;
    flex-direction: column;
  }
  .catalog-context-menu li ul {
    position: absolute;
    width: max-content;
    order: 1;
    padding-left: 0;
    background-color: #FFF;
    color:#000;
  }
  .catalog-context-menu li:not(:hover) ul {
    display: none;
  }
  .catalog-context-menu li {
    border-bottom: 1px solid #E0E0E0;
    margin: 0;
    padding: 5px 15px;
    display: flex;
    flex-direction: row;
  }
  .catalog-context-menu li span.menu-icon {
    padding-right: 3px;
    margin-right: 3px;
    color: var(--skin-d20) !important;
  }
  .catalog-context-menu li .click-to-copy {
    color: #000;
    opacity: 1;
  }
  .catalog-context-menu li .click-to-copy:hover {
    color: #FFF !important;
    transform: scale(1.1);
  }
  .catalog-context-menu .click-to-copy .tooltip-inner {
    min-width: 200px;
  }
  .catalog-context-menu li.title {
    background: transparent;
    font-size: 1.1em;
    font-weight: bold;
    border-bottom-width: 3px !important;
    flex-direction: column;
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
    background-color: #FFF ;
    color:#000;
    padding: 5px;
    max-width: 200px;
    white-space: normal;
    overflow-y: auto;
    max-height: 150px;
  }
  .catalog-context-menu .tooltip-inner {
    word-break: break-all;
    font-weight: bold;
  }
  .catalog-context-menu .item-text {
    margin-left: 3px;
  }
  .catalog-context-menu :is(ul, li) {
    list-style-type: none;
  }
</style>
