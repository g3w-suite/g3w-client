<!--
  @file
  @since v3.11.0
-->

<template>
  <ul
    v-if            =  "layer_menu || project_menu"
    id              = "layer-context-menu"
    ref             = "menu"
    class           = "catalog-context-menu"
    @mouseover      = "showMenu"
    v-click-outside = "closeMenu"
    tabindex   = "-1"
    :style     = "{
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

    <!-- Layer Metadata -->
    <li
      v-if                = "project_menu || hasMetadata(layer)"
      @click.prevent.stop = "showMetadata(layer && layer.id)"
    >
      <i :class = "$fa('info')"></i> {{ $t('sdk.metadata.title') }}
      <ul
        v-if  = "layer && layer.metadata && layer.metadata.abstract"
        style = "border-radius: 0 3px 3px 0;"
      >
        <li class = "layer-menu-metadata-info" v-html = "layer.metadata.abstract"></li>
      </ul>
    </li>

    <!-- Edit Layer -->
    <li
      v-if                = "canEdit(layer)"
      @click.prevent.stop = "startEditing(layer)"
    >
      <i :class = "$fa('pencil')"></i> {{ $t('catalog_items.contextmenu.edit') }}
    </li>

    <!-- LAYER MENU -->
    <template v-if = "layer_menu">

      <!-- Zoom to Layer -->
      <li
        v-if                = "canZoom(layer)"
        @click.prevent.stop = "zoomToLayer(layer)"
      >
        <i :class = "$fa('search')"></i> {{ $t('catalog_items.contextmenu.zoomtolayer') }}
      </li>

      <!-- Attribute Table -->
      <li
        v-if                = "canOpenAttributeTable(layer)"
        @click.prevent.stop = "showAttributeTable(layer.id)"
      >
        <i :class = "$fa('list')"></i> {{ $t('catalog_items.contextmenu.open_attribute_table') }}
      </li>

      <!-- Change z-index of ol layer. On top or button -->
      <li
        v-if = "isExternalLayer(layer)"
      >
        <i :class = "$fa('sort')"></i>
        {{ $t('layer_position.message') }} ({{ $t('layer_position.' + layer.position) }})
        <i :class = "$fa('arrow-right')" style  = "position: absolute; right: 0; margin-top: 3px"></i>
        <ul>
          <li
            v-for  = "position in ['top', 'bottom']"
            @click = "setLayerPosition(position)"
            style  = "display: list-item;"
          >
            <span
              v-if   = "position === layer.position"
              style  = "font-size: 0.5em; margin-right: 3px;"
              :class = "$fa('circle')"
            ></span>
            <span v-t = "'layer_position.' + position"></span>
          </li>
        </ul>
      </li>

      <!-- Styles menu -->
      <li
        v-if = "canShowStylesMenu(layer)"
      >
        <i :class = "$fa('palette')"></i>
        {{ $t('catalog_items.contextmenu.styles') }} ({{ layer.styles.find(s => s.current).name.toLowerCase() }})
        <i :class = "$fa('arrow-right')" style  = "position: absolute; right: 0; margin-top: 3px"></i>
        <ul>
          <li
            v-for       = "(style, i) in layer.styles"
            @click.stop = "setLayerStyle(i)"
            :key        = "style.name"
            style       = "display: list-item;"
          >
            <span
              v-if   = "style.current"
              style  = "font-size: 0.8em;"
              :class = "$fa('circle')">
            </span>
            {{ style.name + (layer.styles.length > 1 && style.name === layer.defaultstyle ? ` (${$t('default')})` : '') }}
          </li>
        </ul>
      </li>

      <!-- Opacity menu -->
      <li
        v-if = "canShowOpacityPicker(layer)"
      >
        <i :class = "$fa('slider')"></i>
        {{ $t('catalog_items.contextmenu.layer_opacity') }} ({{ (layer.opacity / 100) }})
        <i :class = "$fa('arrow-right')" style = "position: absolute; right: 0; margin-top: 3px"></i>
        <ul>
          <li style="display: list-item;">
            <input
              type    = "range"
              @change = "onLayerOpacity"
              v-model = "layer.opacity"
              min    = "0"
              max    = "100"
              step   = "1"
              list   = "opacity-markers"
            >
            <datalist id="opacity-markers" style="  display: flex; justify-content: space-between;">
              <option value="0">0</option>
              <option value="25">0.25</option>
              <option value="50">0.50</option>
              <option value="75">0.75</option>
              <option value="100">1</option>
            </datalist>
          </li>
        </ul>
      </li>

      <!-- Change opacity (external wms layer) -->
      <li
        v-if = "isExternalWMSLayer(layer)"
      >
        <i :class = "$fa('slider')"></i>
        {{ $t('catalog_items.contextmenu.layer_opacity') }} ({{ layer.opacity }})
        <span :class = "$fa('arrow-right')" style = "position: absolute; right: 0; margin-top: 3px"></span>
        <ul>
          <li style="display: list-item;">
            <input
              type    = "range"
              @change = "onLayerOpacity"
              v-model = "layer.opacity"
              min    = "0"
              max    = "1"
              step   = "0.1"
              list   = "opacity-markers"
            >
            <datalist id="opacity-markers" style="  display: flex; justify-content: space-between;">
              <option>0</option>
              <option>0.25</option>
              <option>0.50</option>
              <option>0.75</option>
              <option>1</option>
            </datalist>
          </li>
        </ul>
      </li>

      <!-- Color picker (external vector layer) -->
      <li
        v-if = "isExternalVectorLayer(layer)"
      >
        <i :class = "$fa('tint')"></i>
        {{ $t('catalog_items.contextmenu.vector_color_menu') }}
        <i    ref="layer_color" style  = "width: 10px;height: 10px;border-radius: 10px;position: absolute;right: 20px;margin-top: 4px;" :style="{ backgroundColor: layer.color }"></i>
        <i :class = "$fa('arrow-right')" style = "position: absolute; right: 0; margin-top: 3px"></i>
        <ul>
          <li style="padding: 14px; background-color: #E0E0E0;">
            <chrome-picker
              ref                 = "color_picker"
              v-model             = "layer.color"
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
        v-if = "canShowFiltersMenu(layer)"
      >
        <i :class = "$fa('filter')"></i>
        {{ $t('catalog_items.contextmenu.filters') }}
        <i :class = "$fa('arrow-right')" style = "position: absolute; right: 0; margin-top: 3px"></i>
        <ul>
          <li
            v-for       = "filter in layer.filters"
            :key        = "filter.fid"
            style       = "display: flex; justify-content: space-between; align-items: baseline"
            @click.stop = "setLayerFilter(filter)"
          >
            <span
              v-if   = "layer.filter.current && layer.filter.current.fid === filter.fid"
              style  = "font-size: 0.5em; margin-right: 3px;justify-self: flex-start"
              :class = "$fa('circle')"
            ></span>
            <span style = "margin-right: 5px;">{{ filter.name }}</span>
            <span
              @click.stop = "deleteFilter(filter.fid)"
              class       = "skin-border-color"
              style       = "color: red; right: 0; padding-left: 10px; border-left: 2px solid;"
              :class      = "$fa('trash')">
            </span>
          </li>
        </ul>
      </li>

      <!-- Click to Download -->
      <li
        v-if      = "canDownload('', layer.id) || isExternalVectorLayer(layer)"
        :disabled = "ApplicationState.download"
        ref       = "download_menu"
      >
        <i :class = "$fa('download')"></i>
        {{ $t('catalog_items.contextmenu.download') }}
        <i :class = "$fa('arrow-right')" style = "position: absolute; right: 0; margin-top: 3px" ></i>
        <bar-loader :loading = "ApplicationState.download"/>
        <ul>

          <!-- Download as GeoTIFF -->
          <li
            v-if                = "canDownload('GeoTIFF', layer.id)"
            @click.prevent.stop = "download('GeoTIFF', layer.id)"
            v-download
          >
            <i :class = "$fa('geotiff')"></i> {{ $t('GeoTiff') }}
          </li>

          <!-- Download as GeoTIFF -->
          <li
            v-if                = "canDownload('GeoTIFF', layer.id)"
            @click.prevent.stop = "download('GeoTIFF', layer.id, true)"
            v-download
          >
            <i :class = "$fa('geotiff')" style = "color:#777"></i>
            <i :class = "$fa('crop')"    style = "position: absolute; left: -7px; bottom: 8px; font-size: 1.2em"></i>
            {{ $t('sdk.catalog.menu.download.geotiff_map_extent') }}
          </li>

          <!-- Download as SHP -->
          <li
            v-if                = "canDownload('Shp', layer.id)"
            @click.prevent.stop = "download('Shp', layer.id)"
            v-download
          >
            <i :class = "$fa('shapefile')"></i> {{ $t('Shapefile') }}
          </li>

          <!-- Download as GPX -->
          <li
            v-if                = "canDownload('Gpx', layer.id)"
            @click.prevent.stop = "download('Gpx', layer.id)"
            v-download
          >
            <i :class = "$fa('gpx')"></i> {{ $t('GPX') }}
          </li>

          <!-- Download as Gpkg -->
          <li
            v-if                = "canDownload('Gpkg', layer.id)"
            @click.prevent.stop = "download('Gpkg', layer.id)"
            v-download
          >
            <i :class = "$fa('gpkg')"></i> {{ $t('GeoPackage') }}
          </li>

          <!-- Download as CSV -->
          <li
            v-if                = "canDownload('Csv', layer.id)"
            @click.prevent.stop = "download('Csv', layer.id)"
            v-download
          >
            <i :class = "$fa('csv')"></i> {{ $t('CSV') }}
          </li>

          <!-- Download as XLS -->
          <li
            v-if = "canDownload('Xls', layer.id)"
            @click.prevent.stop = "download('Xls', layer.id)"
            v-download
          >
            <i :class  = "$fa('xls')"></i> {{ $t('Excel') }}
          </li>

          <!-- Download an external layer (from a proxy file server) -->
          <li
            v-if                = "isExternalVectorLayer(layer) && layer.downloadUrl"
            @click.prevent.stop = "downloadExternal(layer.downloadUrl)"
            v-download
          >
            <i :class = "$fa('download')"></i> {{ $t('sdk.catalog.menu.download.unknow') }}
          </li>

          <!-- Download an external layer (shapefile) -->
          <li
            v-if                = "isExternalVectorLayer(layer) && !layer.downloadUrl"
            @click.prevent.stop = "downloadExternalShapefile(layer)"
            v-download
          >
            <i :class = "$fa('shapefile')"></i> {{ $t('Shapefile') }}
          </li>

        </ul>
      </li>

      <!-- OGC Service URLs -->
      <li
        v-if = "[
          this.canShowWmsUrl(this.layer.id),
          this.canShowWfsUrl(this.layer.id),
          this.canShowWfsUrl(this.layer.id)
        ].filter(Boolean).length"
        ref  = "ogc_menu"
      >
        <i :class = "$fa('map')"></i> {{ $t('catalog_items.contextmenu.ogc_services') }}
        <i :class = "$fa('arrow-right')" style = "position: absolute; right: 0; margin-top: 3px" ></i>
        <ul>

          <!-- Click to Copy WMS URL -->
          <li
            v-if   = "canShowWmsUrl(layer.id)"
            @click = "copyUrl('Wms', $event.target)"
            style = "display: flex; justify-content: space-between;align-items: baseline;"
          >
            <a
              :href  = "getWmsUrl(layer.id)"
              target = "_blank"
              style  = "color:#000"
            >
              <i :class = "$fa('map')"></i> WMS
            </a>
            <b
              class           = "click-to-copy skin-tooltip-top skin-color-dark"
              :class          ="$fa('eye')"
              data-placement  = "top"
              data-toggle     = "tooltip"
              data-container  = "body"
              :title          = "getWmsUrl(layer.id)"
            ></b>
          </li>

          <!-- Click to Copy WFS URL -->
          <li
            v-if   = "canShowWfsUrl(layer.id)"
            @click = "copyUrl('Wfs', $event.target)"
            style = "display: flex; justify-content: space-between;align-items: baseline;"
          >
            <a
              :href  = "getWfsUrl(layer.id)"
              target = "_blank"
              style  = "color:#000"
            >
              <i :class = "$fa('map')"></i> WFS
            </a>
            <b
              class           = "click-to-copy skin-tooltip-top skin-color-dark"
              :class          ="$fa('eye')"
              data-placement  = "top"
              data-toggle     = "tooltip"
              data-container  = "body"
              :title          = "getWfsUrl(layer.id)"
            ></b>
          </li>

          <!-- Click to Copy WFS 3 URL -->
          <li
            v-if   = "canShowWfsUrl(layer.id)"
            @click = "copyUrl('Wfs3', $event.target)"
            style  = "display: flex; justify-content: space-between;align-items: baseline;"
          >
            <a
              :href  = "getWfs3Url(layer.id)"
              target = "_blank"
              style  = "color:#000"
            >
              <i :class = "$fa('map')"></i> WFS 3
            </a>
            <b
              class           = "click-to-copy skin-tooltip-top skin-color-dark"
              :class          ="$fa('eye')"
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
    <li v-if = "layers_url && layer_menu && !isExternalLayer(layer)">
      <a :href = "layers_url" target = "_blank" style = "color: initial">
        <!-- TODO: g3wtemplate.getFontClass('qgis') -->
        <i>
          <svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 32 32" style="height: 14px; vertical-align: -1.5px; fill: currentColor;">
            <path d="m17.61 17.63 4.36-.02-4-3.98h-4.36v4l4 4.45z"/>
            <path d="m31.61 27.22-7.62-7.6-4.38.01v4.33l7.24 7.67h4.76z"/>
            <path d="M18 25.18c-.68.16-1.17.2-1.9.2a9.77 9.77 0 0 1-9.68-9.88c0-5.57 4.4-9.78 9.68-9.78s9.48 4.2 9.48 9.78c0 .91-.15 1.96-.36 2.8l4.88 4.65a15 15 0 0 0 1.95-7.48C32.05 6.87 25.19.44 16 .44 6.86.44 0 6.84 0 15.47c0 8.68 6.86 15.2 16 15.2 2.36 0 4.23-.3 6.2-1.1L18 25.18z"/>
          </svg>
        </i>
        Layers settings
        <i :class = "$fa('external-link')" style  = "position: absolute; right: 0; margin-top: 3px"></i>
      </a>
    </li>

    <!-- Click to open G3W-ADMIN's project page -->
    <li v-if = "edit_url && project_menu">
      <a :href = "edit_url" @click.stop = "closeMenu" target = "_blank" style = "color: initial">
        <!-- TODO: g3wtemplate.getFontClass('qgis') -->
        <i>
          <svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 32 32" style="height: 14px; vertical-align: -1.5px; fill: currentColor;">
            <path d="m17.61 17.63 4.36-.02-4-3.98h-4.36v4l4 4.45z"/>
            <path d="m31.61 27.22-7.62-7.6-4.38.01v4.33l7.24 7.67h4.76z"/>
            <path d="M18 25.18c-.68.16-1.17.2-1.9.2a9.77 9.77 0 0 1-9.68-9.88c0-5.57 4.4-9.78 9.68-9.78s9.48 4.2 9.48 9.78c0 .91-.15 1.96-.36 2.8l4.88 4.65a15 15 0 0 0 1.95-7.48C32.05 6.87 25.19.44 16 .44 6.86.44 0 6.84 0 15.47c0 8.68 6.86 15.2 16 15.2 2.36 0 4.23-.3 6.2-1.1L18 25.18z"/>
          </svg>
        </i>
        Project settings
        <i :class = "$fa('external-link')" style  = "position: absolute; right: 0; margin-top: 3px"></i>
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
        top:           0,
        left:          0,
        project_menu:  false,
        layer_menu:    false,
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

    directives: {
      'click-outside': {
        bind(el, binding, vnode) {
          this.event = e => {
            // skip if a clicked element is a child of element
            if (el === e.target || el.contains(e.target)) {
              return;
            }
            e.stopPropagation();
            vnode.context[binding.expression](e);
          };
          document.body.addEventListener('click', this.event, true)
        },
        unbind() {
          document.body.removeEventListener('click', this.event, true)
        }
      }
    },

    methods: {

      /**
       * @since 3.10.0
       */
       async onShowContextMenu(e, layerstree) {
        this.closeMenu();
        await this.$nextTick();
        this.left         = e.x;
        this.layer        = layerstree || null;
        this.layer_menu   = !!layerstree;
        this.project_menu = !layerstree;
        await this.$nextTick();
        this.top = e.target.getBoundingClientRect().top - this.$refs['menu'].clientHeight + (e.target.clientHeight / 2);
        $('.click-to-copy[data-toggle="tooltip"]').tooltip();
        // conditionally inline "download_menu" and "ogc_menu" when they contain a single item
        [this.$refs.download_menu, this.$refs.ogc_menu].forEach(li => li && li.classList.toggle('inline-submenu', 1 === li.querySelector('ul').children.length));
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
        this.$refs.layer_color.style.backgroundColor = val.hex;
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
       * @param { 'Wms', 'Wfs', 'Wfs3' } format
       * @param { HTMLElement } el
       */
      copyUrl(format, el) {
        const url = this[`get${format}Url`](this.layer.id);
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
       * @param { 'top', 'bottom' } position 
       */
      setLayerPosition(position) {
        if (position !== this.layer.position) {
          this.layer.position = position;
          const map = GUI.getService('map');
          map.getLayerById(this.layer.id).setZIndex(({ top: map.layersCount, bottom: 0 })[position]);
          map.emit('change-layer-position-map', { id: this.layer.id, position });
          this.closeMenu();
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
       * @returns {Boolean} whether layer is editable
       * @since 3.11.0
       */
       canEdit(layer) {
        return layer ? !layer.external && getCatalogLayerById(layer.id).isEditable() : g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing');
      },

      /**
       * @since 3.11.0
       */
       startEditing(layer) {
        this.closeMenu();
        const editing = g3wsdk.core.plugin.PluginsRegistry.getPlugin('editing');
        editing.showPanel(layer ? { toolboxes: [layer.id] } : undefined);
        if (layer) {
          editing.startEditing(layer.id);
        }
      },

      /**
       * @TODO refactor this, almost the same as: `CatalogTristateTree.vue::canZoom(layer))`
       *
       * Check if layer has bbox property
       *
       * @param layer
       */
      canZoom(layer) {
        return (layer.bbox && [layer.bbox.minx, layer.bbox.miny, layer.bbox.maxx, layer.bbox.maxy].find(coord => coord > 0));
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
        ApplicationState.download = true;
        let features = GUI.getService('map').getLayerByName(layer.name).getSource().getFeatures();
        if ('EPSG:4326' !== layer.crs) {
          features = features.map(f => {
            const feat = f.clone();
            feat.getGeometry().transform(layer.crs, 'EPSG:4326');
            return feat;
          });
        }
        const name = layer.name.split(`.${layer.type}`)[0];
        shpwrite.download(
          // GeoJSONFile
          (new ol.format.GeoJSON()).writeFeaturesObject(features, { featureProjection: 'EPSG:4326' }),
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

      async showMetadata(layerId){
        this.closeMenu();
        GUI.getComponent('metadata').click({ open: true });
        if (layerId) {
          setTimeout(() => {
            document.querySelector('#project-catalog [href="#metadata_layers"]').click();
            document.querySelector('#metadata_layers [data-target="#' + layerId + '"]').click();
          });
        }
      },

      setLayerStyle(index) {
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
      async setLayerFilter(filter) {
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
      async showMenu(e) {
        const li = e.target.closest('li');
        const ul = li && li.querySelector('ul');
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
      hasMetadata(layer) {
        return layer.metadata /*&& layer.metadata.abstract*/;
      },

      /**
       * @since 3.8.3
       */
      canShowOpacityPicker(layer) {
        return layer.geolayer && layer.visible;
      },

      /**
       * @param {{ id:? string, value: number }}
       * 
       * @fires VM~layer-change-opacity
       * 
       * @since 3.11.0
       */
       onLayerOpacity() {
        if (this.isExternalWMSLayer(this.layer)) {
          const layer = GUI.getService('map').getLayerById(this.layer.id);
          if (layer) {
            layer.setOpacity(this.layer.opacity);
            GUI.getService('map').emit('change-layer-opacity', { id: this.layer.id, opacity: this.layer.opacity });
          }
        } else {
          const layer = getCatalogLayerById(this.layer.id);
          if (layer) {
            VM.$emit('layer-change-opacity', { layerId: this.layer.id });
            layer.change();
          }
        }

      },

    },

    /**
     * @listens VM~show-project-context-menu
     * @listens VM~show-layer-context-menu
     */
    created() {
      VM.$on('show-project-context-menu', this.onShowContextMenu);
      VM.$on('show-layer-context-menu', this.onShowContextMenu);
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
    z-index: 2;
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
    padding: 8px 25px 8px 15px;
    display: flex;
    flex-direction: row;
  }
  .catalog-context-menu li i {
    padding-right: 3px;
    margin-right: 6px;
    color: var(--skin-d20) !important;
  }
  .catalog-context-menu li .click-to-copy {
    color: #000;
    opacity: 1;
    margin-right: -15px;
    margin-top: 8px;
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
    max-width: 250px;
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
  .catalog-context-menu li.inline-submenu {
    display: list-item;
    padding: 0;
    text-indent: 100%;
    line-height: 0;
    overflow: hidden;
  }
  .catalog-context-menu li.inline-submenu > * {
    display: none;
  }
  .catalog-context-menu li.inline-submenu > ul {
    display: block;
    position: relative;
    left: 0 !important;
    width: 100%;
    text-indent: 0;
    line-height: initial;
  }
  .catalog-context-menu li,
  .catalog-context-menu li.inline-submenu > ul > li {
    font-weight: bold;
  }
  .catalog-context-menu li li {
    font-weight: normal;
  }
</style>
