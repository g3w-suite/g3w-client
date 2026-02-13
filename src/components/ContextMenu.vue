<!--
  @file ORIGINAL SOURCE: src/components/CatalogContextMenu.vue@v4.0.0
  @since v4.1.0
-->

<template>
  <ul
    v-if       = "context"
    ref        = "menu"
    class      = "context-menu"
    @mouseover = "showMenu"
    tabindex   = "-1"
    :style     = "{
      top:  top + 'px',
      left: left + 'px',
    }"
  >

    <!-- CUSTOM ITEMS -->
    <li v-for = "(item, i) in items" :key = "i"  @click.prevent.stop = "item.cbk || (() => {})" :style="{ order: item.position }">
      <i v-if = "item.children" :class = "$fa('arrow-right')" style  = "position: absolute; right: 0; margin-top: 3px"></i>
      <i v-if = "item.icon" :class = "$fa(item.icon)"></i> {{ $t(item.label) }}
      <!--SUB MENU-->
      <ul v-if = "item.children" class = "sub-contex-menu">
        <li
          v-for       = "(child, j) in item.children"
          @click.stop = "child.cbk"
          :key        = "j"
          style       = "display: list-item;"
        >
          <span style = "font-weight: bold">{{ $t(child.label) }}</span>
        </li>
      </ul>
    </li>

    <!-- MENU NAME -->
    <li v-if="['project', 'layer'].includes(context)" class = "title g3w-long-text">
      <div v-if = "'project' === context">{{ ApplicationState.project.getName() }}</div>
      <div v-else-if="'layer' === context">
        {{ layer.title }}
        <div style = "font-weight: normal; font-size: 0.8em">
          {{ getGeometryType(layer.id, layer.external) }}
        </div>
      </div>
    </li>

    <!-- Layer Metadata -->
    <li
      v-if                = "'project' === context || hasMetadata(layer)"
      @click.prevent.stop = "showMetadata(layer && layer.id)"
    >
      <i :class = "$fa('info')"></i> {{ $t('Metadata') }}
      <ul
        v-if  = "layer && layer.metadata && layer.metadata.abstract"
        style = "border-radius: 0 3px 3px 0;"
        class = "sub-contex-menu"
      >
        <li class = "layer-menu-metadata-info" v-html = "layer.metadata.abstract"></li>
      </ul>
    </li>

    <!-- Edit Layer -->
    <li
      v-if                = "canEdit(layer)"
      @click.prevent.stop = "0 === map_coords.length && startEditing(layer)"
    >
      <i :class = "$fa('pencil')"></i> {{ $t('Edit Layer') }} 
      <i v-if = "'map' === context" :class = "$fa('arrow-right')" style  = "position: absolute; right: 0; margin-top: 3px"></i>
      <ul v-if = "'map' === context" class = "sub-contex-menu">
        <li
          v-for       = "layer in editableGeometryLayers()"
          @click.stop = "startEditing({ id: layer.getId() })"
          :key        = "layer.getId()"
          style       = "display: list-item;"
        >
          <span style = "font-weight: bold">{{  layer.getName() }} </span>
        </li>
      </ul>
    </li>

    <!-- Layer Legend -->
    <li
      v-if                = "['project', 'layer'].includes(context)"
      @click.prevent.stop = "showLegend"
    >
      <i class = "fas fa-list"></i> {{ $t('legend') }}
    </li>

    <!-- LAYER MENU -->
    <template v-if = "'layer' === context">

      <!-- Zoom to Layer -->
      <li
        v-if                = "canZoom(layer)"
        @click.prevent.stop = "zoomToLayer(layer)"
      >
        <i :class = "$fa('search')"></i> {{ $t('Zoom to Layer') }}
      </li>

      <!-- Attribute Table -->
      <li
        v-if                = "canOpenAttributeTable(layer)"
        @click.prevent.stop = "showAttributeTable(layer.id)"
      >
        <i :class = "$fa('list')"></i> {{ $t('Open Attribute Table') }}
      </li>

      <!-- Change z-index of ol layer. On top or button -->
      <li
        v-if = "isExternalLayer(layer)"
      >
        <i :class = "$fa('sort')"></i>
        {{ $t('layer_position.message') }} ({{ $t('layer_position.' + layer.position) }})
        <i :class = "$fa('arrow-right')" style  = "position: absolute; right: 0; margin-top: 3px"></i>
        <ul class = "sub-contex-menu">
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
        {{ $t('Style') }} ({{ layer.styles.find(s => s.current).name.toLowerCase() }})
        <i :class = "$fa('arrow-right')" style  = "position: absolute; right: 0; margin-top: 3px"></i>
        <ul class = "sub-contex-menu">
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
        {{ $t('Opacity') }} ({{ (layer.opacity / 100) }})
        <i :class = "$fa('arrow-right')" style = "position: absolute; right: 0; margin-top: 3px"></i>
        <ul class = "sub-contex-menu">
          <li style = "display: list-item;">
            <input
              type    = "range"
              @change = "onLayerOpacity"
              v-model = "layer.opacity"
              min    = "0"
              max    = "100"
              step   = "1"
              list   = "opacity-markers"
            >
            <datalist id ="opacity-markers" style ="display: flex; justify-content: space-between;">
              <option value = "0">0</option>
              <option value = "25">0.25</option>
              <option value = "50">0.50</option>
              <option value = "75">0.75</option>
              <option value = "100">1</option>
            </datalist>
          </li>
        </ul>
      </li>

      <!-- Change opacity (external wms/tms layer) -->
      <li
        v-if = "isExternalImageLayer(layer)"
      >
        <i :class = "$fa('slider')"></i>
        {{ $t('Opacity') }} ({{ layer.opacity }})
        <span :class = "$fa('arrow-right')" style = "position: absolute; right: 0; margin-top: 3px"></span>
        <ul class = "sub-contex-menu">
          <li style = "display: list-item;">
            <input
              type    = "range"
              @change = "onLayerOpacity"
              v-model = "layer.opacity"
              min     = "0"
              max     = "1"
              step    = "0.01"
              list    = "opacity-markers"
            >
            <datalist id = "opacity-markers" style = "display: flex; justify-content: space-between;">
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
        {{ $t('Color') }}
        <i    ref="layer_color" style  = "width: 10px;height: 10px;border-radius: 10px;position: absolute;right: 20px;margin-top: 4px;" :style="{ backgroundColor: layer.color }"></i>
        <i :class = "$fa('arrow-right')" style = "position: absolute; right: 0; margin-top: 3px"></i>
        <ul class = "sub-contex-menu">
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
        {{ $t('Filters') }}
        <i :class = "$fa('arrow-right')" style = "position: absolute; right: 0; margin-top: 3px"></i>
        <ul class = "sub-contex-menu">
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
        v-if                = "canDownload(layer.id) || isExternalVectorLayer(layer)"
        :disabled           = "ApplicationState.download"
        @click.prevent.stop = "showDownloadMenu(layer)"
      >
        <i :class = "$fa('download')"></i>
        {{ $t('Download') }}
      </li>

    </template>

    <!-- Click to open G3W-ADMIN's project layers page -->
    <li v-if = "layers_url && 'layer' === context && !isExternalLayer(layer)">
      <a :href = "layers_url" target = "_blank" style = "color: initial">
        <!-- TODO: g3wtemplate.getFontClass('qgis') -->
        <i>
          <svg xmlns = "http://www.w3.org/2000/svg" xml:space = "preserve" viewBox = "0 0 32 32" style = "height: 14px; vertical-align: -1.5px; fill: currentColor;">
            <path d = "m17.61 17.63 4.36-.02-4-3.98h-4.36v4l4 4.45z"/>
            <path d = "m31.61 27.22-7.62-7.6-4.38.01v4.33l7.24 7.67h4.76z"/>
            <path d = "M18 25.18c-.68.16-1.17.2-1.9.2a9.77 9.77 0 0 1-9.68-9.88c0-5.57 4.4-9.78 9.68-9.78s9.48 4.2 9.48 9.78c0 .91-.15 1.96-.36 2.8l4.88 4.65a15 15 0 0 0 1.95-7.48C32.05 6.87 25.19.44 16 .44 6.86.44 0 6.84 0 15.47c0 8.68 6.86 15.2 16 15.2 2.36 0 4.23-.3 6.2-1.1L18 25.18z"/>
          </svg>
        </i>
        Layers settings
        <i :class = "$fa('external-link')" style = "position: absolute; right: 0; margin-top: 3px"></i>
      </a>
    </li>

    <li v-if = "'map' === context"                                      @click = "copyCoords"><i :class = "$fa('pin')"></i>{{ map_coords.map(c => c.toFixed(2)).join(', ') }}</li>
    <li v-if = "'map' === context"                                      @click = "queryCoords"><i :class = "$fa('unknow')"></i>{{ $t("What's here?") }}</li>
    <li v-if = "'map' === context"                                      @click = "zoomIn"><i class = "fas fa-search-plus"></i>{{ $t('Zoom in') }}</li>
    <li v-if = "'map' === context"                                      @click = "zoomOut"><i class = "fas fa-search-minus"></i>{{ $t('Zoom out') }}</li>
    <li v-if = "'map' === context"                                      @click = "zoomHome"><i :class = "$fa('home')"></i>{{ $t('Fit map extent') }}</li>
    <li v-if = "'map' === context && initConfig.mapcontrols.screenshot" @click = "takeScreenshot"><i :class = "$fa('camera')"></i>{{ $t('Screen capture') }}</li>
    <li v-if = "'map' === context"                                      @click = "showEmbedModal"><i :class = "$fa('share-alt')"></i>{{ $t('Embed map') }}</li>
    <li v-if = "'map' === context && initConfig.mapcontrols.streetview" @click = "showStreetView"><i class = "fas fa-street-view"></i>{{ $t('StreetView') }}</li>
    <li v-if = "'map' === context && initConfig.mapcontrols.annotation" @click = "showAnnotation"><i class = "fas fa-font"></i>{{ $t('Annotation') }}</li>
    <li v-if = "'map' === context"                                      @click = "showLegend"><i class = "fas fa-list"></i>{{ $t('legend') }}</li>

    <!-- Click to open G3W-ADMIN's project page -->
    <li v-if = "edit_url && ['project', 'map'].includes(context)">
      <a :href = "edit_url" @click.stop = "closeMenu" target = "_blank" style = "color: initial">
        <!-- TODO: g3wtemplate.getFontClass('qgis') -->
        <i>
          <svg xmlns = "http://www.w3.org/2000/svg" xml:space = "preserve" viewBox = "0 0 32 32" style = "height: 14px; vertical-align: -1.5px; fill: currentColor;">
            <path d = "m17.61 17.63 4.36-.02-4-3.98h-4.36v4l4 4.45z"/>
            <path d = "m31.61 27.22-7.62-7.6-4.38.01v4.33l7.24 7.67h4.76z"/>
            <path d = "M18 25.18c-.68.16-1.17.2-1.9.2a9.77 9.77 0 0 1-9.68-9.88c0-5.57 4.4-9.78 9.68-9.78s9.48 4.2 9.48 9.78c0 .91-.15 1.96-.36 2.8l4.88 4.65a15 15 0 0 0 1.95-7.48C32.05 6.87 25.19.44 16 .44 6.86.44 0 6.84 0 15.47c0 8.68 6.86 15.2 16 15.2 2.36 0 4.23-.3 6.2-1.1L18 25.18z"/>
          </svg>
        </i>
        Project settings
        <i :class = "$fa('external-link')" style = "position: absolute; right: 0; margin-top: 3px"></i>
      </a>
    </li>

  </ul>
</template>

<script>
  import { Chrome as ChromeComponent } from 'vue-color';

  import ApplicationState        from 'g3w-state';
  import GUI                     from 'g3w-app';
  import { getCatalogLayerById } from 'utils/getCatalogLayerById';
  import { downloadFeatures }    from 'utils/downloadFeatures';
  import { copyUrl }             from 'utils/copyUrl';
  import { gettext as _ }        from 'g3w-i18n';

  /**
   * @see https://www.w3schools.com/howto/howto_js_draggable.asp 
   */
   function dragElement(menu) {
    const el = menu.querySelector('li.title');
    if (!el || menu._drag) {
      return;
    } else {
      menu._drag = true;
    }
    let x2 = 0, y2 = 0, x1 = 0, y1 = 0;
    el.addEventListener('mousedown', function(e) {
      // skip dragging on form elements
      if (['.select2-container', 'button', 'select', 'input', 'textarea'].some(i => e.target.closest(i))) {
        return;
      }
      e.preventDefault();
      x1 = e.clientX;
      y1 = e.clientY;
      document.addEventListener('mouseup', mouseUp);
      document.addEventListener('mousemove', mouseMove);
    });
    function mouseUp() {
      document.removeEventListener('mouseup', mouseUp);
      document.removeEventListener('mousemove', mouseMove);
    }
    function mouseMove(e) {
      e.preventDefault();
      x2 = x1 - e.clientX;
      y2 = y1 - e.clientY;
      x1 = e.clientX;
      y1 = e.clientY;
      if (menu.style.marginLeft) { x2 -= parseInt(menu.style.marginLeft); menu.style.marginLeft = null; }
      if (menu.style.marginTop)  { y2 -= parseInt(menu.style.marginTop);  menu.style.marginTop  = null; }
      menu.style.top  = (menu.offsetTop - y2)    + "px";
      menu.style.left = (menu.offsetLeft - x2) + "px";
    }
  }

  export default {
    name: 'context-menu',

    props: {
      external: {
        type: Object
      }
    },

    data() {
      return {
        ApplicationState,
        layerstree:       null,
        layer:            null,
        layer_style:      null,
        top:              0,
        left:             0,
        context:          null,
        map_coords:       [],
        items:            [], /**@since 4.1.0 store custom items add from plugins/custom.js */
      };
    },

    computed: {

      edit_url() {
        return ApplicationState.project.getState().edit_url;
      },

      layers_url() {
        return ApplicationState.project.getState().layers_url;
      },

      initConfig() {
        return window.initConfig;
      },

    },

    components: {
      'chrome-picker': ChromeComponent,
    },

    methods: {

      /**
       * @since 3.10.0
       */
       async onShowContextMenu(e, layerstree) {
        this.closeMenu();

        this.layerstree = layerstree;

        await this.$nextTick();

        this.left   = e.x;
        this.top    = e.y;

        const layer = !layerstree?.nodes && layerstree; // check for "layer" or "group"
        this.layer  = layer || null;

        // click on catalog tree (node)
        if (!!layer) {
          this.context = 'layer';
        }

        // click on catalog tree (root)
        if (layerstree && !layer) {
          this.context = 'project';
        }

        // click on canvas (map)
        if (!layerstree && !layer) {
          this.context = 'map'; 
        }

        /**
         * @since 4.1.0 custom context menu items
         * 
         * Example: Single item addition
         * ```js
         * GUI.on('map:context-menu', menu => {
         *   menu.items.push({
         *     icon: 'pencil',
         *     label: 'TEST',
         *     cbk: () => alert('Test'),
         *     position: 0,
         *   });
         * });
         * ```
         * Example : Item with children (sub menu)
         * ```js
         * GUI.on('layer:context-menu', menu => {
         *   menu.items.push({
         *     icon: 'pencil',
         *     label: 'TEST CHILDREN',
         *     children: [{ label: 'Child 1', cbk: () => alert('child 1') }],
         *     position: 100,
         *   });
         * });
         * ```
         */
        GUI.emit(`${this.context}:context-menu`, this);

        await this.$nextTick();

        // open menu at catalog entry
        if (['layer','project'].includes(this.context)) {
          this.top = e.target.getBoundingClientRect().top - this.$refs.menu.clientHeight + (e.target.clientHeight / 2);
        }

        // handle context menu on mobile
        if (window.innerWidth < 767) {
          this.left = (window.innerWidth / 2) - (this.$refs.menu.clientWidth / 2);
          this.top  = (window.innerHeight / 2) - (this.$refs.menu.clientHeight / 2);
        }

        dragElement(this.$refs.menu);

        const rect = this.$refs.menu.getBoundingClientRect();

        // prevent right overflow (page) 
        if (rect.right > window.innerWidth) {
          this.left = window.innerWidth - rect.width;
        }

        // prevent bottom overflow (page) 
        if (rect.bottom > window.innerHeight) {
          this.top = window.innerHeight - rect.height;
        }
      },

      showDownloadMenu(layer) {
        downloadFeatures({ layer });
        this.closeMenu();
      },

      /**
       * @param { string } menu
       */
      closeMenu() {
        this.context      = null;
        this.items.length = 0;
        this.layerstree   = null;
      },

      onChangeColor(val) {
        this.layer.color         = val;
        this.$refs.layer_color.style.backgroundColor = val.hex;
        const layer              = GUI.getLayerByName(this.layer.name || '');
        const style              = layer.getStyle();
        style._g3w_options.color = val;
        layer.setStyle(style);
      },

      /**
       * @param { string } format
       * @param { string } layerId
       * 
       * @since 3.11.0
       */
      canDownload(layerId) {
        // exclude pdf format. It is used only for single feature download
        return getCatalogLayerById(layerId)?.getDownloadFormats()?.filter(f => 'pdf' !== f)?.length;
      },

      /**
       * @param { 'top', 'bottom' } position 
       */
      setLayerPosition(position) {
        if (position !== this.layer.position) {
          this.layer.position = position;
          GUI.getLayerById(this.layer.id).setZIndex(({ top: GUI.layersCount, bottom: 0 })[position]);
          GUI.emit('change-layer-position-map', { id: this.layer.id, position, type: this.layer._type });
          this.closeMenu();
        }
      },

      /**
       * @TODO refactor this, almost the same as: `CatalogTree.vue::zoomToLayer(layer))`
       *
       * @FIXME add description
       *
       * @param layer
       */
      zoomToLayer(layer) {
        try {
          let bbox = [layer.bbox.minx, layer.bbox.miny, layer.bbox.maxx, layer.bbox.maxy];
          let epsg = layer.epsg || GUI.getEpsg();
          bbox = epsg === GUI.getEpsg() ? bbox : ol.proj.transformExtent(bbox, epsg, GUI.getEpsg());
          const geometry = ol.extent.containsExtent(ApplicationState.project.state.extent, bbox) ? bbox : ApplicationState.project.state.extent;
          const view = GUI.getMap().getView();
          view.animate(
            { duration: 200, center:     view.getCenter() },
            { duration: 200, resolution: view.getResolution() }
          );
          view.fit(geometry, { constrainResolution: true, size: GUI.getMap().getSize() });
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
        return layer ? !layer.external && getCatalogLayerById(layer.id).isEditable() && getCatalogLayerById(layer.id).config.editing?.visible: Object.values(GUI.getPlugin('editing')?.getEditableLayers() || {}).find(l => l.isGeoLayer());
      },

      /**
       * @since 4.1.0
       */
      editableGeometryLayers() {
        return Object.values(GUI.getPlugin('editing')?.getEditableLayers() || {}).filter(l => l.isGeoLayer());
      },

      /**
       * @since 3.11.0
       */
      async startEditing(layer) {
        //store toolboxes id 
        const toolboxes = [];
        if (layer) {
          toolboxes.push(layer.id);
        }

        //In case of no layer, right click on group on TOC
        //get layers belog to groups that are editable
        if (!layer && false === this.layerstree?.root) {
          const traverse = n => {
            if (n.id && getCatalogLayerById(n.id).isEditable()) { toolboxes.push(n.id) }
            if (n.nodes) { n.nodes.forEach(traverse); }
          };
          traverse(this.layerstree);
        }
          
        this.closeMenu();
        const editing = GUI.getPlugin('editing');
        //check if has coordinates
        if (2 === this.map_coords.length) {
          try {
            const project  = ApplicationState.project;
            const response = await GUI.getData('query:coordinates', {
              inputs: {
                coordinates:           this.map_coords,
                feature_count:         project.state.feature_count || 5,
                query_point_tolerance: project.getQueryPointTolerance(),
                layerIds:              [layer.id], //get layerId of editibale layers          
              },
              outputs: false //no content is show
            });
            if (response?.result && response?.data?.length) {

              if (response?.data[0]?.features?.length) {
                
                editing.getToolBoxById(layer.id).start({
                  filter: { fids: response?.data[0]?.features.map(f => f.getId()).join(',') }
                });
                
              } 
            }
          } catch(e) {
            console.warn('Error running spatial query: ', e);
          }
          editing.showPanel({ toolboxes });
          return;

        }

        //Show all editing panel
        if (0 === toolboxes.length) {
          editing.showPanel();
          return;
          
        }

        //show some editing layers 
        editing.showPanel({ toolboxes });
        
        //In case of just on layer in editing, start editing
        if (1 === toolboxes.length) {
          editing.startEditing(toolboxes[0]);
        }

      },

      /**
       * @TODO refactor this, almost the same as: `CatalogTree.vue::canZoom(layer))`
       *
       * Check if layer has bbox property
       *
       * @param layer
       */
      canZoom(layer) {
        return (layer.bbox && [layer.bbox.minx, layer.bbox.miny, layer.bbox.maxx, layer.bbox.maxy].find(coord => coord > 0));
      },

      getGeometryType(layerId, external=false) {
        const layer = external ? ApplicationState.catalog.external.vector.find(l => layerId === l.id) : getCatalogLayerById(layerId);
        if (layer) {
          const type = external ? layer.geometryType : layer.config.geometrytype;
          return layer && 'NoGeometry' !== type && type || '';
        }
        return '';
      },

      showAttributeTable(layerId) {
        getCatalogLayerById(layerId).openAttributeTable();
        this.closeMenu();
      },

      async showMetadata(layerId){
        this.closeMenu();
        $('#modal-metadata').modal('show');
        if (layerId) {
          setTimeout(() => {
            document.querySelector('#modal-metadata [href="#metadata_layers"]').click();
            setTimeout(() => {
              //close all open details eventually
              document.querySelectorAll('#metadata_layers summary').forEach(s => s.parentElement.removeAttribute('open'));
              const dom = document.querySelector(`summary:has(+ ul a[href="#layer_general_${layerId}"])`);
              //skin when no layer is found on layers metadata tab
              if (!dom) {
                return;
              }
              dom.scrollIntoView();
              //click if only is no open tab
              if (!dom.parentElement.hasAttribute('open')) {
                dom.click();
              }
            });
          });
        } else {
          setTimeout(() => {
            document.querySelector('#modal-metadata [href="#metadata_general"]').click();
          });
        }
      },

      setLayerStyle(index) {
        this.layer_style = this.layer.styles[index].name;
        //change layer style
        getCatalogLayerById(this.layer.id).changeStyle(this.layer_style);
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
          filter.fid !== this.layer.filter.current.fid 
        );
        const layer = getCatalogLayerById(this.layer.id);
        if (changed) {
          await layer.applyToken(filter);
        } else {
          await layer.deleteToken();
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
        // No found catalog layer
        if (!layer) { return }
        const change = fid === this.layer.fid;
        await layer.deleteToken(fid);
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
          const overflowY    = (ul.offsetHeight + ul.getBoundingClientRect().top) >= (this.$refs.menu.offsetHeight + this.$refs.menu.getBoundingClientRect().top);
          ul.style.top       = ul.offsetHeight > this.$refs.menu.offsetHeight ? 0 : undefined;
          ul.style.left      = this.$refs.menu.offsetWidth -2 + 'px';
          ul.style.maxHeight = this.$refs.menu.offsetHeight + 'px';
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
        return !layer.projectLayer;
      },

      /**
       * @since 4.1.0
       */
      isExternalImageLayer(layer) {
        return !layer.projectLayer && ['wms', 'tms'].includes(layer._type);
      },

      /**
       * @since 3.8.3
       */
      isExternalVectorLayer(layer) {
        return !layer.projectLayer && 'vector' === layer._type;
      },

      /**
       * @since 3.8.3
       */
      canShowStylesMenu(layer) {
        return layer?.styles?.length > 1;
      },

      /**
       * @returns { boolean } whether it can show filters menu
       *
       * @since 3.9.0
       */
      canShowFiltersMenu(layer) {
        return layer?.filters?.length > 0;
      },

      /**
       * @since 3.8.3
       */
      hasMetadata(layer) {
        return layer?.metadata;
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
       * @fires GUI~layer-change-opacity since 4.1.0
       * 
       * @since 3.11.0
       */
      onLayerOpacity() {
        if (this.isExternalImageLayer(this.layer)) {
          const layer = GUI.getLayerById(this.layer.id);
          if (layer) {
            layer.setOpacity(Number(this.layer.opacity));
            GUI.emit('change-layer-opacity', { id: this.layer.id, opacity: Number(this.layer.opacity), type: this.layer._type });
          }
        } else {
          const layer = getCatalogLayerById(this.layer.id);
          if (layer) {
            GUI.emit('layer-change-opacity', { layerId: this.layer.id });
            layer.change();
          }
        }

      },

      /**
       * @since 4.1.0
       */
      async copyCoords() {
        this.closeMenu();
        const map    = GUI.getMap();
        const view   = map.getView();
        view.animate({ center: this.map_coords, zoom: view.getZoom(), duration: 200 });
        copyUrl(this.map_coords.join(', '));
      },

      /**
       * @since 4.1.0
       */
      async queryCoords() {
        this.closeMenu();
        try {
          const project = ApplicationState.project;
          await GUI.getData('query:coordinates', {
            inputs: {
              coordinates:           this.map_coords,
              feature_count:         project.state.feature_count || 5,
              query_point_tolerance: project.getQueryPointTolerance(),
              multilayers:           [].concat(project.state.querymultilayers).includes(this.name),
            }
          });
        } catch(e) {
          console.warn('Error running spatial query: ', e)
        }
      },

      /**
       * @since 4.1.0
       */
      zoomIn() {
        this.closeMenu();
        const map    = GUI.getMap();
        const view   = map.getView();
        view.animate({ center: this.map_coords, zoom: view.getZoom() + 1, duration: 200 });
      },

      /**
       * @since 4.1.0
       */
      zoomOut() {
        this.closeMenu();
        const map    = GUI.getMap();
        const view   = map.getView();
        view.animate({ center: this.map_coords, zoom: view.getZoom() - 1, duration: 200 });
      },

      /**
       * @since 4.1.0
       */
      zoomHome() {
        this.closeMenu();
        const map = GUI.getMap();
        const view = map.getView();
        const extent = GUI.project.state.extent;
        view.fit(extent, { duration: 200 });
      },

      /**
       * @since 4.1.0
       */
      showStreetView() {
        this.closeMenu();
        GUI.getMapControl('streetview').showStreetView(this.map_coords);
      },

      /**
       * @since 4.1.0
       */
      showAnnotation() {
        this.closeMenu();
        GUI.getMapControl('annotation').toggle();
      },

      /**
       * @since 4.1.0
       */
      showLegend() {
        this.closeMenu();
        GUI.showLegendPanel();
      },

      /**
       * @since 4.1.0
       */
      takeScreenshot() {
        this.closeMenu();
        GUI.getMapControl('screenshot').toggle(true);
      },

      /**
       * @since 4.1.0
       */
      async showEmbedModal() {
        this.closeMenu();
        await GUI.getPermalink(new URL(window.location.href), {});
      },

    },

    /**
     * @listens GUI~context-menu
     */
    async created() {

      GUI.on('context-menu', this.onShowContextMenu);
      
      // auto-close context menu on Esc key
      document.addEventListener('keyup', e => {
        if ('Escape' === e.key) {
          this.closeMenu();
        }
      });

      // auto-close context menu when clicking outside
      document.addEventListener('click', e => {
        if (this.context && !this.$el.contains(e.target)) {
          e.stopPropagation();
          this.closeMenu();
        }
      }, true);

      await GUI.isReady();
      await GUI.isMapReady()

      // handle click on map
      GUI.getMap().on(['singleclick', 'contextmenu'], e => {
        const ctx  = 'contextmenu' == e.type;
        const ctrl = GUI.getCurrentToggledMapControl();
        // avoid conflict with measure control (right click to undo last added vertex)
        if ('measure' === ctrl?.name || false === GUI.getMap().get('can_show_context_menu')) {
          return;
        }
        // suppress built-in context menu (from browser)
        if (ctx) {
          e.preventDefault();
        }
        // show our custom context menu
        if (ctx || (!ctrl && !GUI.getPlugin('editing')?.getLayers?.()?.some?.(l => l.isInEditing()))) {
          this.map_coords = GUI.getMap().getCoordinateFromPixel([e.pixel[0], e.pixel[1]]);
          GUI.emit('context-menu', e.originalEvent);
        }
      });
    
    },


  };
</script>

<style>
  .context-menu {
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
  .context-menu li ul {
    position: absolute;
    width: max-content;
    order: 1;
    padding-left: 0;
    background-color: #FFF;
    color:#000;
  }
  .context-menu li:not(:hover) ul {
    display: none;
  }
  .context-menu li {
    border-bottom: 1px solid #E0E0E0;
    margin: 0;
    padding: 8px 25px 8px 15px;
    display: flex;
    flex-direction: row;
  }

  .context-menu li:not(.title) {
    align-items: center;
  }

  .context-menu li i {
    padding-right: 3px;
    margin-right: 6px;
    color: hsl(from var(--skin-color) h s calc(l - 20)) !important;
  }
  .context-menu li .click-to-copy {
    color: #000;
    opacity: 1;
    margin-left: 1ch;
    margin-right: -15px;
    margin-top: 8px;
  }
  .context-menu li .click-to-copy:hover {
    color: #FFF !important;
    transform: scale(1.1);
  }
  .context-menu .click-to-copy .tooltip-inner {
    min-width: 200px;
  }
  .context-menu li.title {
    background: transparent !important;
    font-size: 1.1em;
    font-weight: bold;
    border-bottom-width: 3px !important;
    flex-direction: column;
    max-width: 250px;
    cursor: move !important;
    color: #000 !important;
    border-bottom-color: var(--skin-color) !important;
  }
  .context-menu li:last-child {
    border-bottom: none;
  }
  .context-menu li:hover {
    color: #fafafa;
    cursor: pointer;
    background: hsl(from var(--skin-color) h s calc(l + 10));
  }
  .context-menu li .layer-menu-metadata-info {
    background-color: #FFF ;
    color:#000;
    padding: 5px;
    max-width: 200px;
    white-space: normal;
    overflow-y: auto;
    max-height: 150px;
  }
  .context-menu .tooltip-inner {
    word-break: break-all;
    font-weight: bold;
  }
  .context-menu .item-text {
    margin-left: 3px;
  }
  .context-menu :is(ul, li) {
    list-style-type: none;
  }
  .context-menu li.inline-submenu {
    display: list-item;
    padding: 0;
    text-indent: 100%;
    line-height: 0;
    overflow: hidden;
  }
  .context-menu li.inline-submenu > * {
    display: none;
  }
  .context-menu li.inline-submenu > ul {
    display: block;
    position: relative;
    left: 0 !important;
    width: 100%;
    text-indent: 0;
    line-height: initial;
  }
  .context-menu li,
  .context-menu li.inline-submenu > ul > li {
    font-weight: bold;
  }
  .context-menu li li {
    font-weight: normal;
  }
  
  .context-menu .sub-contex-menu {
    border: 1px solid #eee;
    border-left: 0;
  }
</style>
