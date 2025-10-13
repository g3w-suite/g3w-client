/**
 * @file
 * 
 * ORIGINAL SOURCE: src/map/controls/screenshot.js@v4.0.0
 * ORIGINAL SOURCE: src/components/Print.vue@v4.0.0
 * 
 * @since 4.1.0
 */

const {
  PRINT_SCALES,
  TIMEOUT,
}                      = g3w.constants;
const ApplicationState = g3w.state;
const GUI              = g3w.app;
const MapControl       = g3w.Control;
const { Component }    = g3w;
const {
  getScaleFromResolution,
  getResolutionFromScale,
  getCatalogLayerById,
  saveBlob,
  sameOrigin,
} = g3w.utils;

const _                = g3w.gettext;

// wait for map ready
GUI.setupControl.screenshot = 
GUI.setupControl.geoscreenshot = function(type) {
  if (!isMobile.any && !GUI.getMapControlByType('screenshot')) {
    /**
     * @FIXME prevent tainted canvas error
     * 
     * Because the pixels in a canvas's bitmap can come from a variety of sources,
     * including images or videos retrieved from other hosts, it's inevitable that
     * security problems may arise. As soon as you draw into a canvas any data that
     * was loaded from another origin without CORS approval, the canvas becomes
     * tainted.
     * 
     * A tainted canvas is one which is no longer considered secure, and any attempts
     * to retrieve image data back from the canvas will cause an exception to be thrown.
     * 
     * @see https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image
     */
    const control = new MapControl({
      name: "maptoimage",
      tipLabel: "Screenshot",
      clickmap: true,
      enabled:  true,
    });
    control.on('toggled', () => { GUI.getComponent('print').click(); });
    GUI.addControl('screenshot', control);
  }
};

if (GUI.getComponent('print')) {
  throw 'print component already added';
}

// G3W-PRINT
GUI.addComponent(Object.assign(new Component({
  id:                'print',
  visible:           window.initConfig.user.is_staff || (ApplicationState.project.getPrint() || []).length > 0, /** @since 3.10.0 Check if the project has print layout*/
  icon:              g3w.app.getFontClass('print'),
  iconColor:         '#FF9B21',
  title:             'print',
  internalComponent: new (Vue.extend({})),
  collapsible:       false,
}), {
  _setOpen: async () => {
    if (ApplicationState.usermessage.show) {
      GUI.closeUserMessage()
    } else {
      GUI.showUserMessage({
        title: 'print',
        type: 'tool',
        size: 'small',
        iconClass: 'print',
        closable: true,
        hooks: {
          body: Vue.extend(vueComp)
        }
      });
    }
  },
}), { position: 'search' });

const vueComp = ({
template: /*html*/`
<div class="print-modal">
  <bar-loader :loading = "state.loading" />

  <form
    v-if  = "state.print.length"
    style = "padding: 10px;max-height: 75vh;overflow-y: auto;"
  >

    <!-- PRINT TEMPLATE -->
    <label for = "templates" v-t = "'Template'"></label>
    <select
      id             = "templates"
      class          = "form-control"
      v-select2      = "'state.template'"
      :select2_value = "state.template"
      :style         = "{ marginBottom: this.state.atlas && '10px' }"
      @change        = "changeTemplate"
    >
      <option v-for = "print in state.print" :value = "print.name">{{ print.name }}</option>
      <option v-if="screenshot_types.length" value = "__G3W_SCREENSHOT__">{{ $t('Screenshot') }}</option>
    </select>

    <button v-if="is_customizable" type="button" @click="toggleAdvancedOptions" class="btn btn-block" style="margin: 15px 0;">
      <span v-if="advanced_options">-</span>
      <span v-else>+</span>
      Advanced options
    </button>

    <template v-if = "is_customizable && advanced_options">

      <!-- PRINT SCALE -->
      <label for = "scale" v-t = "'Scale'"></label>
      <select
        id             = "scale"
        class          = "form-control"
        v-disabled     = "!has_maps"
        v-select2      = "'state.scale'"
        :select2_value = "state.scale"
        :createTag     = "true"
        @change        = "changeScale"
        ref            = "scales"
      >
        <option v-for = "scale in state.scales" :value = "scale.value">{{ scale.label }}</option>
      </select>

      <!-- PRINT DPI -->
      <label for = "dpi">dpi</label>
      <select
        id             = "dpi"
        class          = "form-control"
        v-select2      = "'state.dpi'"
        :select2_value = "state.dpi"
        @change        = "changeDpi"
        :createTag     = "true"
        ref            = "dpi"
      >
        <option v-for = "dpi in state.dpis">{{ dpi }}</option>
      </select>

      <!-- PRINT ROTATION -->
      <label for = "rotation" v-t = "'Rotation'"></label>
      <input
        id         = "rotation"
        class      = "form-control"
        v-disabled = "!has_maps"
        min        = "-360"
        max        = "360"
        @input     = "changeRotation"
        v-model    = "state.rotation"
        type       = "number"
      />

      <!-- PRINT FORMAT -->
      <label for = "format" v-t = "'Format'"></label>
      <select
        id             = "format"
        class          = "form-control"
        v-select2      = "'state.format'"
        :select2_value = "state.format"
      >
        <option v-for = "format in state.formats" :value = "format.value">{{ format.label }}</option>
      </select>

    </template>

    <!-- PRINT ATLAS -->
    <div
      v-if  = "!is_screenshot && state.atlas"
      class = "form-group"
      style = "width: 100%;"
      ref   = "print_atlas"
    >
      <!-- ORIGINAL SOURCE: src/componentsPrintSelectAtlasFieldValues.vue@v3.9.3 -->
      <template v-if = "has_autocomplete">
        <label  for = "print_atlas_autocomplete"><span>{{ state.atlas.field_name }}</span></label>
        <select id = "print_atlas_autocomplete" :name = "state.atlas.field_name" class = "form-control"></select>
      </template>
      <!-- ORIGINAL SOURCE: src/components/PrintFidAtlasValues.vue@v3.9.3 -->
      <template v-else>
        <label><span>fids [max: {{ state.atlas.feature_count - 1 }}]</span></label>
        <input class = "form-control" v-model = "atlas_values" @keydown.space.prevent>
        <div id = "fid-print-atals-instruction">
          <div id = "fids_intruction"      v-t = "'Values accepted: from 1 to value of [max]. Is possible to insert a range ex. 4-6'"></div>
          <div id = "fids_examples_values" v-t = "'Ex. 1,4-6 will be printed id 1,4,5,6'"></div>
        </div>
      </template>
    </div>

    <div
      v-if  = "!is_screenshot && state.labels && state.labels.length > 0 && advanced_options"
      class = "print-labels-content"
    >
      <b class = "skin-color" v-t = "'Labels'"></b>
      <div class = "labels-input-content">
        <span
          v-for = "label in state.labels"
          :key  = "label.id"
        >
          <label :for = "'g3w_label_id_input_'+ label.id"> {{ label.id }}</label>
          <input
            :id     = "'g3w_label_id_input_' + label.id"
            class   = "form-control"
            v-model = "label.text"
          />
        </span>
      </div>
    </div>

    <template v-if="is_screenshot">
      <label for = "format" v-t = "'Format'"></label>
      <select id="format" ref="select" style="width: 100%;" :search="false" v-select2="'screenshot_type'">
        <option
          v-for  = "type in screenshot_types"
          :value = "type"
        >{{ $t(({ screenshot: 'PNG', geoscreenshot: 'GeoTIFF'})[type]) }}</option>
      </select>
    </template>

    <button
      class     = "btn btn-block btn-success"
      :disabled = "!can_submit"
      @click    = "print"
      style     = "margin: 15px 0;"
      type      = "button"
    >{{ $t('Generate') }}</button>

    <fieldset
      v-if  = "!is_screenshot"
      style = "
        border: 1px solid;
        padding: 4.9px 8.75px 8.75px 10.5px;
        border-radius: 3px;
        background-color: hsl(from var(--bgcolor) h s calc(l + 8));
        user-select:none
      "
    >
      <legend style="
        width: 15px;
        height: 15px;
        border: 1px solid;
        border-radius: 50%;
        background-color: rgb(34, 45, 50);
        font-weight: bold;
        color: rgb(255, 255, 255);
        font-size: 0.7em;
        display: flex;
        justify-content: center;
        margin: 0px -14px;
        user-select: none;
      ">i</legend>
      <details>
        <summary
          v-t-tooltip:right = "'Show more'"
          style             = "
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
          "
        >
          <span style="text-overflow: ellipsis;overflow: hidden;">{{ $t('Exportable layers are defined by the administrator') }}</span>
          <i class="far fa-eye"></i>
        </summary>
        <hr style="margin: 10px 0;border-style: dotted;color:black;">
        <div style="white-space: wrap; line-height: 25px;" v-t="'print_help'"></div>
      </details>
    </fieldset>

  </form>

  <div v-if="is_staff" style = "padding: 1em;text-align: center;">
    <b>
      <a
        :href           = "'https://docs.qgis.org/3.34/' + lang + '/docs/training_manual/map_composer/map_composer.html'"
        target          = "_blank"
        data-i18n-title = "QGIS Docs"
        data-placement  = "right"
      >
      <i :class = "$fa('external-link')"></i> {{ $t('Edit in QGIS') }}
      </a>
    </b>
  </div>

  <dialog
    ref    = "dialog"
    style  = "max-width: max(70vw, 800px);"
    @click = "$event.target === $event.target.closest('dialog') && $event.target.closest('dialog').close()"
  >
    <form method="dialog">
      <bar-loader :loading = "state.loading && state.layers" />
      <h4 v-if = "!state.layers"><b>{{ $t('No Layer to print') }}</b></h4>
      <menu style="position: sticky;top: 0;">
        <a
          v-if       = "state.layers && !['pdf', 'geopdf'].includes(state.format)"
          :href      = "state.url"
          @click     = "downloadImage($event)"
          class      = "btn btn-success"
          :disabled  = "!!(state.downloading && state.layers)"
          title      = "Download Image"
        ><i :class = "$fa('download')"></i> {{ $t('Download') }}</a>
        <button
          value = "cancel"
          style = "border: none;line-height: 1;font-weight: 700;font-size: 25px;background: none;position: absolute;inset: 0 0 auto auto;width: 40px;height: 40px;"
          title = 'close'
        >&times;</button>
      </menu>
      <!-- PRINT as PDF or GEOPDF-->
      <iframe
        v-if   = "state.layers && ['pdf', 'geopdf'].includes(state.format)"
        :src   = "state.url"
        @load  = "ready = true"
        @error = "ready = true"
        style  = "border:0; width:100%; height:100%;"
      ></iframe>

      <!-- PRINT as PNG, JPG, SVG -->
      <img
        v-if   = "state.layers && !['pdf', 'geopdf'].includes(state.format)"
        :src   = "state.url"
        @load  = "ready = true"
        @error = "ready = true"
        style  = "height:auto; width: 100%;"
      >
    </form>
  </dialog>
</div>
`,

  /** @since 3.8.6 */
  name: 'print',

  data() {
    this.init();
    const screenshot_types = Object.keys(initConfig.mapcontrols).filter(t => ['screenshot', 'geoscreenshot'].includes(t));
    return {
      /** @since 4.0.0 */
      ApplicationState,
      state: this.state || {},
      disabled: false,
      /** @since 3.10.0 */
      atlas_values:   [],
      advanced_options: false,
      ready: false,
      screenshot_types,
      screenshot_type: screenshot_types[0]
    };
  },

  computed: {

    /**
     * @returns { boolean } whether current print has maps (only alphanumerical data)
     * 
     * @since 3.9.4
     */
    has_maps() {
      return (this.state.maps || []).length > 0;
    },

    //in the case of current template is atlas and has field_name
    has_autocomplete() {
      return !!(this.state.atlas && this.state.atlas.field_name);
    },

    /** @since 3.10.0  */
    lang() {
      return ApplicationState.language;
    },

    /** @since 4.1.0 */
    is_staff() {
      return window.initConfig.user.is_staff;
    },

    is_screenshot() {
      return '__G3W_SCREENSHOT__' === this.state.template;
    },

    is_customizable() {
      return !this.is_screenshot && !this.state.atlas;
    },

    /**
     * Check visibility for map control based on layers URLs.
     * 
     * Allow printing external WMS layers only when they have
     * the same origin URL of the current application in order to avoid
     * CORS issue while getting map image.
     * 
     * Layers that don't have a source URL are excluded (eg. base layers)
     * 
     * @param {array} layers
     * 
     * @returns {boolean}
     */
    can_screenshot() {
      // Need to be visible.
      // If it was not visible, the CORS issue was raised.
      // Need to reload and remove layer
      return ![...Object.values(ApplicationState.layers).flatMap(s => s.getLayers()), ...GUI.getExternalLayers()].some(this.isCrossOrigin);
    },

    can_submit() {
      return !this.disabled && !this.state.loading && (this.is_screenshot ? this.can_screenshot : true) && !ApplicationState.download;
    },

  },

  methods: {

    init() {
      this._init        = undefined !== this._init ? this._init: false;
      this._moveKey     = this._moveKey || null;
      this._resolutions = this._resolutions || {};

      const print   = ApplicationState.project.getPrint() || [];
      const visible = print.length > 0;

      const PRINT_FORMATS = [
        { value: 'png', label: 'PNG' },
        { value: 'jpg', label: 'JPG' },
        { value: 'svg', label: 'SVG' },
        { value: 'pdf', label: 'PDF' },
        { value: 'geopdf', label: 'GEOPDF' },
      ];

      this.state = Object.assign(this.state || {}, {
        visible,
        print,
        loading:      false,
        downloading:  false,
        url:          null,
        layers:       true,
        maps:         visible ? print[0].maps   : undefined,
        labels:       visible ? print[0].labels : undefined,
        template:     visible ? print[0].name   : undefined,
        atlas:        visible ? print[0].atlas  : undefined,
        rotation:     visible ? 0               : undefined,
        inner:        [0, 0, 0, 0],
        scales:       [], // initial set empty
        scale:        visible ? null            : undefined,
        dpis:         [150, 300],
        dpi:          150,
        formats:      PRINT_FORMATS,
        format:       PRINT_FORMATS[0].value,
      });

      /**@since v3.10 Store map extent for print in case of already open print page*/
      this.print_extent = null;

    },

    async changeTemplate() {
      if (!this.state.template) { return; }

      await this.$nextTick();

      const has_previous = this.state.atlas || 0 === this.state.maps.length;
      const print        = this.state.print.find(p => p.name === this.state.template);

      if (!print) {
        this.showPrintArea(false);
        return;
      }

      // destroy select2 dom element and remove all events
      if (this.select2) {
        this.select2.select2('destroy');
        this.select2.off();
        this.select2 = null;
      }

      this.disabled = false;

      Object.assign(this.state, {
        maps:        print.maps,
        atlas:       print.atlas,
        labels:      print.labels,
      });

      this.atlas_values = [];

      if (this.state.atlas) {
        this._clearPrint();
        this.initSelect2Field();
      } else if (has_previous) {
        this.showPrintArea(true);
      } else {
        this._setPrintArea();
      }

      await this.$nextTick();
    },

    /**
     * On scale change set print area
     */
    changeScale() {

      try {
        //check if create new tag value with ':' 1:2300
        if (this.state.scale.includes(':')) {
          //get value
          const scale = Number(this.state.scale.split(':')[1].trim());
          //set options last tag created by user
          this.$refs.scales.children.at(-1).value = scale;
          //set scale
          this.state.scale = scale;

        }
      } catch(e) {
        console.warn(e);
        this.state.scale = this.state.scales[0].value;
      }

      //check if a current scale is a number or has a value more than maximum scale permission
      if (Number.isNaN(Number(this.state.scale)) || (this.state.scale > this.state.scales[0].value)) {
        this.state.scale = this.state.scales[0].value;
      }

      //In case of scale negative or less than minimum scale permission
      if (this.state.scale < 0) {
        this.state.scale = this.state.scales.at(- 1).value;
      }

      //set value
      $(this.$refs.scales).val(this.state.scale).trigger('change');

      if (this.state.scale) { this._setPrintArea(); }


    },

    /**
     * @since 3.10.0
     */
    changeDpi() {
      //check dpi if si a NaN
      if (Number.isNaN(Number(this.state.dpi))) {
        this.state.dpi = this.state.dpis[0];
        //set value
        $(this.$refs.dpi).val(this.state.dpi).trigger('change');
      }
    },

    /**
     * On change rotation, rotate print area
     */
    changeRotation() {
      this.state.rotation = this.state.rotation >= 0 ? Math.min(this.state.rotation || 0, 360) : Math.max(this.state.rotation || 0, -360);
      GUI.setInnerGreyCoverBBox({ rotation: this.state.rotation });
    },

    /**
     * @since 3.11.0
     */
    isAxisOrientationInverted() {
      return 'neu' === GUI.getProjection().getAxisOrientation();
    },

    /**
     * @param extent
     *
     * @returns { string }
     */
    getOverviewExtent(extent={}) {
      const { xmin, xmax, ymin, ymax } = extent;
      return (this.isAxisOrientationInverted() ? [ymin, xmin, ymax, xmax] : [xmin, ymin, xmax, ymax]).join();
    },

    /**
     * @returns { string }
     */
    getPrintExtent() {
      const map          = GUI.getMap();
      // Need to check in case di an open print page
      try {
        const [xmin, ymin] = map.getCoordinateFromPixel([this.state.inner[0], this.state.inner[1]]);
        const [xmax, ymax] = map.getCoordinateFromPixel([this.state.inner[2], this.state.inner[3]]);
        this.print_extent  = (this.isAxisOrientationInverted() ? [ymin, xmin, ymax, xmax] : [xmin, ymin, xmax, ymax]).join();
      }
      catch(e) {
         //in case of already open content print page
        console.warn(e);
      }

      return this.print_extent;
    },

    async downloadImage(e) {
      try {
        e.preventDefault();
        e.stopPropagation();
        GUI.disableSideBar(true);
        this.state.downloading = true;
        if (['jpg', 'png', 'svg'].includes(this.state.format)) {
          await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = async () => {
              const canvas  = document.createElement('canvas');
              canvas.height = img.naturalHeight;
              canvas.width  = img.naturalWidth;
              canvas.getContext('2d').drawImage(img, 0, 0);
              saveBlob(await (await fetch(canvas.toDataURL(`image/${this.state.format}`))).blob(), g3w.state.project.getName());
              this.$refs.dialog.close();
              resolve();
            };
            img.onerror = reject;
            img.src = this.state.url;
          });
          setTimeout(() => {
            GUI.disableSideBar(false);
            this.state.downloading = false;
          });
        }
      } catch (e) {
        console.warn(e);
      }
    },

    /*
    http://localhost/fcgi-bin/qgis_mapserver/qgis_mapserv.fcgi
      ?MAP=/home/marco/geodaten/projekte/composertest.qgs
      &SERVICE=WMS&VERSION=1.3.0
      &REQUEST=GetPrint
      &TEMPLATE=Composer 1
      &map0:extent=693457.466131,227122.338236,700476.845177,230609.807051
      &BBOX=693457.466131,227122.338236,700476.845177,230609.807051
      &CRS=EPSG:21781
      &WIDTH=1467
      &HEIGHT=729
      &LAYERS=layer0,layer1
      &STYLES=,
      &FORMAT=pdf
      &DPI=300
      &TRANSPARENT=true

    In detail, the following parameters can be used to set properties for composer maps:

    <mapname>:EXTENT=<xmin,ymin,xmax, ymax> //mandatory
    <mapname>:ROTATION=<double> //optional, defaults to 0
    <mapname>:SCALE=<double> //optional. Forces scale denominator as server and client may have different scale calculations
    <mapname>:LAYERS=<comma separated list with layer names> //optional. Defaults to all layer in the WMS request
    <mapname>:STYLES=<comma separated list with style names> //optional
    <mapname>:GRID_INTERVAL_X=<double> //set the grid interval in x-direction for composer grids
    <mapname>:GRID_INTERVAL_Y=<double> //set the grid interval in x-direction for composer grids
    */
    /**
     * @returns { Promise<unknown> }
     */
    async print() {
      if (this.is_screenshot) {
        return this.generate_screenshot(this.screenshot_type);
      }

      const has_atlas = !!this.state.atlas;
      let err;
      let response;

      this.state.loading = true;

      try {

        // disable sidebar
        GUI.disableSideBar(true);

        // ATLAS PRINT
        if (has_atlas) {
          await GUI.printAtlas(undefined, undefined, {
            template: this.state.template,
            field:    this.state.atlas.field_name || '$id',
            values:   this.atlas_values,
          });
        }

        // SIMPLE PRINT
        if (!has_atlas) {
          this.state.url     = null;
          this.state.layers  = true;

          const has_theme = this.state.maps.some(m => undefined !== m.preset_theme);
          const store     = ApplicationState.project.getLayersStore();
          const layers    = store.getLayers({ PRINTABLE: { scale: this.state.scale }, SERVERTYPE: 'QGIS' }).reverse(); // reverse order is important
          const LAYERS    = (layers || []).map(l => l.isRaster() ? (l.state.wms_use_layer_ids ? l.getId() : l.getName()) : undefined).join();
          const url       = ApplicationState.project.state.WMSUrl;
          const params    = layers.length && new URLSearchParams(await GUI.getPrintParams({
            SERVICE:       'WMS',
            VERSION:       '1.3.0',
            REQUEST:       'GetPrint',
            TEMPLATE:       this.state.template,
            DPI:            this.state.dpi,
            STYLES:         layers.map(l => l.getStyle()).join(','),
            OPACITIES:      layers.map(l => parseInt((l.getOpacity() / 100) * 255)).join(','), //@since 4.0.1 send OPACITIES parameter
            ...(has_theme ? {} : { LAYERS }), // in the case of a map that has preset_theme, no LAYERS need tyo pass as parameter.
            FORMAT:         ({ png: 'png', pdf: 'application/pdf', geopdf: 'application/pdf' })[this.state.format] || this.state.format,
            ...('geopdf' === this.state.format ? { FORMAT_OPTIONS: 'WRITE_GEO_PDF:TRUE'} : {}), //@since 3.10.0
            CRS:            store.getProjection().getCode(),
            filtertoken:    ApplicationState.tokens.filtertoken,
            ...this.state.maps.map(m => ({
              name:         m.name,
              preset_theme: m.preset_theme,
              scale:        m.overview ? m.scale : this.state.scale,
              extent:       m.overview ? this.getOverviewExtent(m.extent) : this.getPrintExtent()
            })).reduce((params, map) => Object.assign(params, {
              [`${map.name}:SCALE`]:    map.scale,
              [`${map.name}:EXTENT`]:   map.extent,
              [`${map.name}:ROTATION`]: this.state.rotation,
              //need to specify LAYERS from mapX in case of maps has at least one preset theme set, otherwise get layers from LAYERS param
              ...(has_theme && undefined === map.preset_theme ? { [`${map.name}:LAYERS`]: LAYERS } : {})
            }), {}),
            ...(this.state.labels || []).reduce((params, label) => Object.assign(params, { [label.id]: label.text }), {})
          })).toString();

          response = await (fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
            body:  params,
          }));
          
          if (200 !== response.status) {
            throw new Error(response.statusText);
          }

          this.state.url       = URL.createObjectURL(await response.blob());
          this.state.layers    = !!response.ok;

          this.$refs.dialog.showModal();

          this.state.loading = false;
        }

      } catch(e) {
        if (response && !response.ok && 500 === response.status) {
          err = 500 === response.status ? 'Internal Server Error' : 'Request Failed';
        } else {
          err = e;
        }
        this.state.loading = false;
        // enable sidebar
        GUI.disableSideBar(false);
        console.warn(e);
      }

      this.state.loading = false;

      ApplicationState.download = false;

      // in case of no layers
      if (has_atlas || !this.state.layers) {
        GUI.disableSideBar(false);
      }

      if (err) {
        console.warn(err);
        GUI.notify.error(err || _("info.server_error"));
        GUI.closeContent();
      }

    },

    /**
     * @param { boolean } show
     */
    showPrintArea(show) {
      // close content if open
      const reset = !show;
      if (reset && this.select2)           { this.select2.val(null).trigger('change'); }
      if (reset)                           { this.atlas_values = []; this.print_extent = null; }
      // @since 3.11.0 In case of no print set, exit
      if (0 === this.state.print.length)   {
        return;
      }
      GUI
        .closeContent()
        .then(() => {
          setTimeout(() => {
            GUI.getMap().once('postrender', () => {
              if (!show) {
                return this._clearPrint();
              }
              this._moveKey = GUI.getMap().on('moveend', this._setPrintArea.bind(this));
              this._initPrintConfig();
              // show print area if is not atlas template and have maps
              if (undefined === this.state.atlas && this._setPrintArea()) {
                GUI.setModal(true);
              }
            });
            GUI.getMap().renderSync();
          })
        })
    },

    /**
     * Calculate internal print extent
     * @returns { Boolean }
     */
    _setPrintArea() {
      // No maps set. Only attributes label
      if (!this.has_maps) {
        this._clearPrint();
        return false;
      }
      const map        = GUI.getMap();
      const size       = map.getSize();
      const resolution = map.getView().getResolution();
      const { h, w }   = this.state.maps.find(m => !m.overview);
      const res        = resolution * ('m' === GUI.getMapUnits() ? 1  : ol.proj.Units.METERS_PER_UNIT.degrees); // resolution in meters
      const w2         = (((w / 1000.0) * parseFloat(this.state.scale)) / res) / 2;
      const h2         = (((h / 1000.0) * parseFloat(this.state.scale)) / res) / 2;
      const [x, y]     = [ (size[0]) / 2, (size[1]) / 2 ]; // current map center: [x, y] (in pixel)
      this.state.inner = [x - w2, y + h2, x + w2, y - h2]; // inner bbox: [xmin, ymax, xmax, ymin] (in pixel)
      GUI.setInnerGreyCoverBBox({
        type:     'pixel',
        inner:    this.state.inner,
        rotation: this.state.rotation
      });
      return true;
    },

    _clearPrint() {
      ol.Observable.unByKey(this._moveKey);
      this._moveKey = null;
      GUI.setModal(false);
    },

    /**
     * Set all scales based on max resolution
     *
     * @param maxRes maximum resolution
     */
    _setScales(maxRes) {
      const units       = GUI.getMapUnits();
      const mapScale    = getScaleFromResolution(maxRes, units);
      const scales      = PRINT_SCALES.sort((a, b) => b.value - a.value);
      const below       = scales.filter(s => s.value < mapScale);           // all scales below mapScale
      const above       = scales.findLast(s => s.value >= mapScale);        // first scale above mapScale
      this.state.scales = (above ? [above] : []).concat(below);
      this.state.scales.forEach(s => this._resolutions[s.value] = getResolutionFromScale(s.value, units))
    },

    _initPrintConfig() {
      const view = GUI.getMap().getView();
      if (!this._initialized) {
        this._setScales(view.getMaxResolution());
        this._initialized = true;
      }
      const resolution = view.getResolution();

      // set current scale
      Object
        .entries(this._resolutions)
        .find(([scala, res]) => {
          if (resolution <= res) {
            this.state.scale = scala;
            return true
          }
        });
    },


    reload() {
      this.state.print    = ApplicationState.project.state.print || [];
      const visible       = this.state.print.length > 0;
      const init          = this._initialized;
      this.state.template = visible ? this.state.print[0].name : this.state.template;
      if (visible && !init) {
        this.init();
      }
      if (visible) {
        this._initPrintConfig();
        GUI.on('changeviewaftercurrentproject', () => {
          this.state.scales = PRINT_SCALES;
          this._setScales(GUI.getMap().getView().getMaxResolution());
        });
      } else {
        this._clearPrint();
      }
    },

    initSelect2Field() {
      this.select2 = $('#print_atlas_autocomplete').select2({
        width: '100%',
        multiple: true,
        dropdownParent: $(this.$refs.print_atlas),
        minimumInputLength: 1,
        ajax: {
          delay: 500,
          transport: async (d, ok, ko) => {
            try {
              ok({
                results: (await getCatalogLayerById(this.state.atlas.qgs_layer_id).getFilterData({
                  suggest: `${this.state.atlas.field_name}|${d.data.q}`,
                  unique: this.state.atlas.field_name,
                })).map(v => ({ id: v, text: v }))
              });
            } catch(e) {
              console.warn(e);
              ko(e);
            }
          }
        },
        /**
         * @param { Object } params
         * @param params.term the term that is used for searching
         * @param { Object } data
         * @param data.text the text that is displayed for the data object
         */
        matcher: (params, data) => {
          const search = params.term ? params.term.toLowerCase() : params.term;
          if ('' === (search || '').toString().trim())                             { return data; }        // no search terms → get all of the data
          if (data.text.toLowerCase().includes(search) && undefined !== data.text) { return { ...data }; } // the searched term
          return null;                                                                                 // hide the term
        },
        language: {
          noResults:     () => _('No results'),
          errorLoading:  () => _('Error Loading Data'),
          searching:     () => _('Searching ...'),
          inputTooShort: d => `${_('Please enter')} ${d.minimum - d.input.length} ${_('or more characters')}`,
        },
      });
      this.select2.on('select2:select',   e => { this.atlas_values.push(e.params.data.id); });
      this.select2.on('select2:unselect', e => { this.atlas_values = this.atlas_values.filter(v => v != e.params.data.id); }); // NB: != instead of !== because sometime we need to compare "numbers" with "strings"
    },

    toggleAdvancedOptions() {
      this.advanced_options = !this.advanced_options;
    },

    async generate_screenshot(type) {
      // Start download
      ApplicationState.download = true;
      try {
        const blob = 'screenshot' === type
          ? await GUI.createMapImage()                                                              // PNG
          : await (await fetch(`/${GUI.project.getType()}/api/asgeotiff/${GUI.project.getId()}/`, { // GeoTIFF
              method: 'POST',
              body: Object.entries({
                image:               await GUI.createMapImage(),
                csrfmiddlewaretoken: GUI.getCookie('csrftoken'),
                bbox:                GUI.getMapBBOX().toString(),
              }).reduce((a, k) => { a.append(k[0], k[1]); return a; }, new FormData())
            })).blob();
        // handle click when app is within iframe (ref: "IframePluginService" → overwriteOnClickEvent)
        (this._onclick || saveBlob)(blob, `map_${Date.now()}`);
      } catch (e) {
        GUI.showUserMessage({
          type:    'SecurityError' === e.name ? 'warning' : 'alert',
          message: 'SecurityError' === e.name ? 'screenshot_error' : 'Screenshot error creation',
        });
        console.warn(e);
      }
      // End download
      ApplicationState.download = false;
      return true;
    },

    /**
     * Check if a layer has a Cross Origin source URI
     * 
     * @param layer
     * 
     * @returns {boolean} `true` whether the given layer could cause CORS issues (eg. while printing raster layers). 
     */
    isCrossOrigin(layer) {
      let source_url;

      // vector or hidden layers can't cause CORS issues
      if ((layer.getVisible && !layer.getVisible()) || layer instanceof ol.layer.Vector) {
        return false;
      }

      if (layer instanceof ol.layer.Layer && layer.getSource().crossOrigin) {
        return false;
      }
      
      // image layer (OpenLayers)
      if (layer instanceof ol.layer.Tile || layer instanceof ol.layer.Image) { 
        const urls = [layer.getSource()?.getUrl?.(), layer.getSource()?.getUrls?.()].filter(Boolean);
        return urls.length && urls.some(url => !sameOrigin(url, location));
      }

      // external image layer (eg: "core/layers/imagelayer.js")
      if ((layer.getConfig().source || {}).external) { 
        source_url = layer.getConfig().source.url;
        return source_url && !sameOrigin(source_url, location);
      }

      return false;
    },

  },

  watch: {

    ready: {
      handler(bool) {
        GUI.setLoadingContent(!bool);
      },
      immediate: true,
    },

    async has_autocomplete(b) {
      if (!b) { return; }
      await this.$nextTick();
      this.initSelect2Field();
    },

    atlas_values: {
      immediate: true,
      async handler(vals) {
        if (this._skip_atlas_check || !this.state.atlas) {
          return;
        }
        if (this.has_autocomplete) {
          this.disabled = 0 === vals.length;
          return;
        }
        const validate = n => (n && Number.isInteger(1 * n) && 1 * n >= 0 && 1 * n < this.state.atlas.feature_count) || null;
        const values = new Set();
        const value = (vals ? vals[0] : '') || '';
        value
          .split(',')
          .filter(v => v)
          .forEach(value => {
            if (!value.includes('-') && null !== validate(value)) {
              values.add(value);
              return;
            }
            const _values = value.split('-');
            const range = _values.filter(v => validate(v) !== null);
            if (range.length === _values.length && range.reduce((bool, value, i) => bool && ((0 === i) || range[i-1] <= value), true)) {
              for (let i = 1; i < range.length; i++) {
                for (let j = range[i-1]; j < range[i]; j++ ) { values.add(j+''); }
              }
              values.add(range[range.length-1]);
            }
          });
        this._skip_atlas_check = true;
        this.atlas_values = Array.from(values);
        await this.$nextTick();
        this._skip_atlas_check = false;
        this.disabled = '' === value.trim();
      }
    },

    'state.url': async function(url) {
      if (!url) {
        return;
      }
      let timeout;

      try {

        await this.$nextTick();

        // add timeout
        timeout = setTimeout(() => {
          GUI.disableSideBar(false);
          this.state.downloading = false;
          GUI.showUserMessage({ type: 'alert', message: 'timeout' });
        }, TIMEOUT);

        const response = await fetch(url);

        if (!response.ok) {
          throw response.statusText;
        }
      } catch (e) {
        console.warn(e);
        GUI.notify.error(e || _("info.server_error"));
        GUI.closeContent();
      } finally {
        clearTimeout(timeout);
        GUI.disableSideBar(false);
        this.state.downloading = false;
      }

    }

  },

  /**
   * @since 3.10.2
   */
  async mounted() {
    await this.$nextTick();
    // when default print template is "atlas" → initialize select2
    if (this.state.atlas) {
      this.initSelect2Field();
    }
    this.showPrintArea(true);

    document.body.appendChild(this.$refs.dialog);

    this.$refs.dialog.addEventListener('close', () => {
      if (this.state.url && 'POST' === ApplicationState.project.state.ows_method) {
        URL.revokeObjectURL(this.state.url);
      }
      // GUI.getMap().once('postrender', this._setPrintArea.bind(this));
    });
  },

  beforeDestroy() {
    this.showPrintArea(false);
    this.$refs.dialog.close();
    this.$refs.dialog.remove();

  },

});

document.head.insertAdjacentHTML(
  'beforeend',
  /* css */`
<style>
.print-modal .select2-container--open {
  width: 100%;
}
.print-modal .select2-container--open input.select2-search__field {
  color: #555;
  width: 100%;
}
.print-modal .select2.select2-container {
  display: block;
}

.print-modal .print-labels-content {
  margin: 15px 0;
}
.print-modal .print-labels-content > span.skin-color {
  font-size: 1.1em;
  display: block;
  border-bottom: 2px solid #fff;
  margin-bottom: 5px;
}

.print-modal .print-labels-content > .labels-input-content {
  max-height: 120px;
  overflow-y: auto
}

.print-modal #fids_intruction {
  white-space: pre-line;
}

.print-modal #fids_examples_values {
  margin-top: 3px;
  font-weight: bold;
}

.print-modal details[open] .fa-eye {
  display: none;
}

.print-modal details[open] summary > span {
  overflow: visible !important;
}

.print-modal details:not([open]) summary > span {
  white-space: nowrap;
}
</style>`
);