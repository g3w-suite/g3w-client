<!--
  @file
  @since v3.7
-->

<template>
  <!-- Modal -->
  <div
    class    = "modal fade"
    id       = "modal-addlayer"
    ref      = "modal_addlayer"
    role     = "dialog"
    tabindex = "-1"
  >
    <div class = "modal-dialog">
      <div class = "modal-content">

        <!-- MODAL HEADER -->
        <div class = "modal-header">
          <button
            type         = "button"
            class        = "close"
            data-dismiss = "modal">&times;</button>
          <h4
            style = "font-weight: bold"
            v-t   = "'mapcontrols.add_layer_control.header'"
            class = "modal-title"></h4>
        </div>

        <!-- MODAL BODY -->
        <div class = "modal-body">

          <div class="form-group">
            <label v-t="'layer_type'"></label>
            <select id="add-layer-type" class = "form-control" v-model="layer_type">
              <option disabled :value="undefined" v-t="'choose_type'"></option>
              <option value="wms" v-t="'remote_wms_url'"></option>
              <option value="file" v-t="'local_file'"></option>
            </select>
          </div>

          <hr>

          <!-- LOADING INDICATOR -->
          <bar-loader :loading = "loading"/>

          <template v-if="'wms' === layer_type">

            <div class = "form-group" v-disabled="wms_panel">

              <!-- WMS URL -->
              <div class = "form-group">
                <label for = "add_custom_url_wms_input" title = "required">URL</label>
                <a
                  :href  = "`https://g3w-suite.readthedocs.io/en/v3.7.x/g3wsuite_client.html#wms`"
                  target = "_blank"
                  style  = "float: right;"
                  title  = "Docs"
                >
                  <i :class = "$fa('external-link')"></i>
                </a>
                <input
                  id           = "add_custom_url_wms_input"
                  v-model.trim = "url"
                  class        = "form-control"
                  placeholder  = "http://example.org/?&service=WMS&request=GetCapabilities"
                  type         = "url"
                  list         = "wms_urls"
                />
                <datalist id="wms_urls">
                  <option v-for = "wms in adminwmsurls" :key  = "wms.url" :value="wms.url">{{ wms.id }}</option>
                  <option v-for = "wms in localwmsurls" :key  = "wms.id" :value="wms.url">{{ wms.id }}</option>
                </datalist>
              </div>

              <!-- WMS NAME -->
              <div v-if="url && !wms_panel" class = "form-group">
                <label for = "add_custom_name_url_wms_input" title = "required">
                  <span v-t = "'sidebar.wms.panel.label.name'"></span>
                  <i style = "font-family: Monospace;color: var(--skin-color);">*</i>
                </label>
                <input
                  id           = "add_custom_name_url_wms_input"
                  v-model.trim = "id"
                  class        = "form-control"
                />
              </div>

              <!-- SUBMIT BUTTON -->
              <button
                v-if                = "!wms_panel"
                v-disabled          = "!inputswmsurlvalid"
                @click.prevent.stop = "addwmsurl"
                class               = "btn btn-block btn-success"
              ><b :class = "$fa('plus-square')"></b> <span v-t="'connect_to_wms'"></span></button>

            </div>

            <div v-if="!wms_panel" class="form-group">

              <!-- LIST OF WMS LAYERS (STORED ON SERVER) -->
              <div
                v-for = "wms in adminwmsurls"
                :key  = "wms.url"
                style = "
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  border-bottom: 1px solid #ccc;
                  padding-bottom: 3px;
                "
              >

                <!-- WMS ID -->
                <span style = "flex-grow: 1;">{{ wms.id }}</span>

                <!-- ADD NEW WMS LAYER -->
                <b
                  @click.stop            = "showWmsLayersPanel(wms.id)"
                  style                  = "color: var(--skin-color); padding: 5px; font-size: 1.3em;"
                  v-t-tooltip:top.create = "'connect_to_wms'"
                  :class                 = "$fa('eye')"
                ></b>

              </div>

              <!-- LIST OF WMS LAYERS (STORED ON LOCAL STORAGE) -->
              <div
                v-for = "wms in localwmsurls"
                :key  = "wms.id"
                style = "border-bottom: 1px solid #ccc; padding-bottom: 3px;"
              >
                <div style = "display: flex; justify-content: space-between; align-items: center; padding-top: 3px">

                  <!-- WMS NAME -->
                  <b style = "flex-grow: 1;">{{ wms.id }}</b>

                  <!-- ADD NEW WMS LAYER -->
                  <i
                    @click.stop            = "showWmsLayersPanel(wms.url)"
                    v-t-tooltip:top.create = "'connect_to_wms'"
                    :class                 = "'wms-icon-action ' + $fa('eye')"
                    style                  = "color: var(--skin-color); padding: 3px; margin: 2px;"
                  ></i>

                  <!-- DELETE WMS -->
                  <i
                    @click.stop            = "deleteWmsUrl(wms.id)"
                    v-t-tooltip:top.create = "'sidebar.wms.delete_wms_url'"
                    :class                 = "'wms-icon-action ' + $fa('trash')"
                    style                  = "color: red; padding: 3px; margin: 2px;"
                  ></i>

                </div>

                <!-- WMS URL -->
                <small>{{ wms.url }}</small>

              </div>

            </div>

            <div v-if="wms_panel" v-disabled = "loading">

              <button
                type                   = "button"
                class                  = "close"
                style                  = "float: right; padding: 5px 10px; margin-top: -5px;outline: 1px solid; color: red; opacity: 1;"
                @click                 = "clearPanel"
                v-t-tooltip:left.create = "'disconnect_from_wms'"
              >&times;</button>

              <h3 class = "skin-color g3w-wms-panel-title">{{ title }}</h3>

              <!-- LAYER INFO -->
              <fieldset v-if="abstract" class="form-group" style="border: 1px solid #c0c0c0; padding: 4.9px 8.75px 8.75px 10.5px;border-radius: 3px;">
                <legend style="width: 15px;height: 15px;border: 1px solid;border-radius: 50%;background-color: #222d32;font-weight: bold;color: #fff;font-size: 0.7em; text-align: center; margin: 0 -14px;user-select: none;">i</legend>
                <span v-t = "abstract"></span>
              </fieldset>

              <!-- LAYERS NAME   -->
              <label for = "g3w-wms-layers" v-t = "'sidebar.wms.panel.label.layers'"></label>
              <select id = "g3w-wms-layers" :multiple = "true" :clear = "true" v-select2 = "'selectedlayers'">
                <option v-for = "layer in layers" :key = "layer.name" :value = "layer.name">{{ layer.title }}</option>
              </select>

              <!-- EPSG PROJECTIONS   -->
              <label for = "g3w-wms-projections" v-t = "'sidebar.wms.panel.label.projections'"></label>
              <select id = "g3w-wms-projections" v-select2 = "'epsg'">
                <option v-for = "proj in projections" :key = "proj" :value = "proj">{{ proj }}</option>
              </select>

              <!-- LAYER POSITION -->
              <div class = "form-group">
                <label for = "position-layer" v-t = "'layer_position.message'"></label>
                <select id = "position-layer" class = "form-control" v-model = "position">
                  <option :value = "'top'"    v-t = "'layer_position.top'"></option>
                  <option :value = "'bottom'" v-t = "'layer_position.bottom'"></option>
                </select>
              </div>

              <!-- NAME OF LAYER TO SAVE -->
              <label for = "g3w-wms-layer-name" v-t = "'sidebar.wms.panel.label.name'"></label>
              <input id  = "g3w-wms-layer-name" class = "form-control" v-model = "name">

              <div v-if  = "added" class = "g3w-wms-external-panel-layer-added-message"
                v-t   = "'sidebar.wms.layer_id_already_added'">
              </div>

            </div>

          </template>

          <template v-else-if="'file' === layer_type">

            <!-- LAYER PROJECTION -->
            <div class = "form-group" v-disabled = "['kmz', 'zip'].includes(layer.type)">
              <label for="projection-layer" v-t = "'mapcontrols.add_layer_control.select_projection'"></label>
              <select class = "form-control" id = "projection-layer" v-model = "layer.crs">
                <option v-for = "option in options" :value = "option">{{option}}</option>
              </select>
            </div>

            <!-- LAYER POSITION -->
            <div class = "form-group">
              <label for="position-layer" v-t = "'layer_position.message'"></label>
              <select class = "form-control" id = "position-layer" v-model = "position">
                <option :value = "'top'" v-t = "'layer_position.top'"></option>
                <option :value = "'bottom'" v-t = "'layer_position.bottom'"></option>
              </select>
            </div>

            <!-- PERSISTENT LAYER  -->
            <div class = "form-group">
              <label for="persistent-layer" v-t = "'mapcontrols.add_layer_control.persistent_data'"></label>
              <select class = "form-control" id = "persistent-layer" v-model = "persistent">
                <option :value = "false" v-t = "'no'"></option>
                <option :value = "true" v-t = "'yes'"></option>
              </select>
              <small v-t = "'mapcontrols.add_layer_control.persistent_help'"></small>
            </div>

            <!-- LAYER COLOR  -->
            <p v-t = "'mapcontrols.add_layer_control.select_color'" style = "font-weight: 700;"></p>
            <chrome-picker
              v-model = "layer.color"
              @input  = "onChangeColor"
              style   ="width:100%; margin:auto"
            />

            <form id = "addcustomlayer">
              <input
                ref     = "input_file"
                type    = "file"
                title   = " "
                @change = "onChangeFile($event)"
                :accept = "accepted_extension">
              <h4 v-t="'mapcontrols.add_layer_control.drag_layer'"></h4>
              <h4
                v-if  = "layer.name"
                class = "skin-color"
                style = "font-weight: bold">{{ layer.name }}</h4>
              <div>
                <i
                  :class      = "g3wtemplate.getFontClass('cloud-upload')"
                  class       = "fa-5x"
                  aria-hidden = "true">
                </i>
              </div>
              <p style = "font-weight: bold">[.gml, .geojson, .kml, .kmz ,.gpx, .csv, .zip(shapefile)]</p>
            </form>

            <div v-if = "csv_extension" style = "padding: 15px; border: 1px solid grey; border-radius: 3px">
              <bar-loader :loading = "csv.loading"/>
              <div class = "select_field">
                <label
                  v-t = "'mapcontrols.add_layer_control.select_csv_separator'"
                  for = "g3w-select-field-layer">
                </label>
                <select
                  id      = "g3w-select-separator"
                  class   = "form-control"
                  v-model = "csv.separator"
                  >
                    <option
                      v-for  = "separator in csv.separators"
                      :key   = "separator"
                      :value = "separator">{{ separator }}</option>
                  </select>
                  <div
                    class="select_field"
                    :class="{'g3w-disabled': !csv.headers || 0 === csv.headers.length }"
                  >
                    <label
                      for = "g3w-select-x-field"
                      v-t = "'mapcontrols.add_layer_control.select_csv_x_field'">
                    </label>
                    <select
                      class   = "form-control"
                      id      = "g3w-select-x-field"
                      v-model = "csv.x"
                    >
                      <option
                        v-for  = "header in csv.headers"
                        :key   = "header"
                        :value = "header">{{ header }}</option>
                    </select>
                  </div>
                  <div
                    class  = "select_field"
                    :class = "{ 'g3w-disabled': !csv.headers || 0 === csv.headers.length }"
                  >
                    <label
                      v-t = "'mapcontrols.add_layer_control.select_csv_y_field'"
                      for = "g3w-select-y-field">
                    </label>
                    <select
                      class   = "form-control"
                      id      = "g3w-select-y-field"
                      v-model = "csv.y"
                    >
                    <option
                      v-for  = "header in csv.headers"
                      :key   = "header"
                      :value = "header">{{ header }}</option>
                    </select>
                  </div>
              </div>
            </div>

            <div
              class  = "select_field"
              :class = "{ 'g3w-disabled': !fields || 0 === fields.length }"
            >
              <label
                v-t = "'mapcontrols.add_layer_control.select_field_to_show'"
                for = "g3w-select-field-layer">
              </label>
              <select
                class   = "form-control"
                id      = "g3w-select-field-layer"
                v-model = "field"
              >
                <option :value = "null">---</option>
                <option
                  v-for  = "field in fields"
                  :key   = "field"
                  :value = "field">{{ field }}</option>
              </select>
            </div>

          </template>

        </div>

        <!-- MODAL FOOTER -->
        <div class = "modal-footer">

          <div
            v-if  = "error_message"
            style = "font-weight: bold; font-size: 1.2em; background-color: orange; padding: 10px; text-align: center"
            v-t   = "error_message">
          </div>

          <!-- ERROR NOTICE -->
          <div v-if      = "status.error" class = "g3w-add-wms-url-message g3w-wmsurl-error">{{ $t('server_error') }}</div>
          <div v-else-if = "status.added" class = "g3w-add-wms-url-message g3w-wmsurl-already-added">&#x26A0;&#xFE0F; {{ $t('sidebar.wms.url_already_added') }}</div>

          <button
            v-t          = "'close'"
            type         = "button"
            class        = "btn btn-default"
            data-dismiss = "modal"
          ></button>

          <!-- SUBMIT BUTTON -->
          <button
            v-if        = "'wms' === layer_type && wms_panel"
            v-t         = "'add'"
            type        = "button"
            class       = "btn btn-success"
            @click.stop = "addWMSlayer({ url, position, epsg, layers: selectedlayers, name: name && name.trim() || undefined })"
            v-disabled  = "0 === selectedlayers.length"
          ></button>
  
          <button
            v-if        = "'file' === layer_type"
            v-t         = "'add'"
            type        = "button"
            class       = "btn btn-success"
            @click.stop = "addLayer"
            :disabled   = "!add"
          ></button>

          </div>

      </div>
    </div>
  </div>
</template>

<script>
import { Chrome as ChromeComponent } from 'vue-color';

import { EPSG }                      from 'g3w-constants';
import ApplicationState              from 'store/application';
import Projections                   from 'store/projections';
import GUI                           from 'services/gui';
import DataRouterService             from 'services/data';
import { createVectorLayerFromFile } from 'utils/createVectorLayerFromFile';
import { getUniqueDomId }            from 'utils/getUniqueDomId';

const SUPPORTED_FORMAT = ['zip','geojson', 'GEOJSON',  'kml', 'kmz', 'KMZ', 'KML', 'json', 'gpx', 'gml', 'csv'];

export default {

  /** @since 3.8.6 */
  name: 'map-add-layer',

  data() {

    const crs = ApplicationState.project.getProjection().getCode();

    // add map crs if not present
    if (!EPSG.includes(crs)) {
      EPSG.unshift(crs)
    }

    return {
      layer_type:         undefined,
      wms_panel:          false,
      adminwmsurls:       this.$options.wmsurls || ApplicationState.project.wmsurls || [],
      localwmsurls:       [], // array of object {id, url}
      url:                null,
      id:                 null,
      status:             { error: false, added: false, },
      vectorLayer:        null,
      options:            EPSG,
      error_message:      '',
      position:           'top', // layer position on map
      persistent:         false,
      loading:            false, // loading reactive status
      fields:             [],
      field:              null,
      accepted_extension: SUPPORTED_FORMAT.map(f => `.${f}`).join(','),
      csv: {
        valid:       false,
        loading:     false,
        headers:     [],
        x:           null,
        y:           null,
        separators : [',', ';'],
        separator:   ',',
      },
      layer: {
        name:   null,
        type:   null,
        crs:    null,
        mapCrs: null,
        color: {
          hex: '#194d33',
          rgba: {
            r: 25,
            g: 77,
            b: 51,
            a: 1,
          },
          a: 1
        },
        data:     null,
        visible:  true,
        title:    null,
        id:       null,
        external: true,
      },
      name:           undefined,  // name of saved layer
      title:          null,       // title of layer
      abstract:       null,       // abstract
      map_formats:    [],         // map formats
      info_formats:   [],         // info formats
      methods:        [],         // @since 3.9.0
      layers:         [],         // Array of layers
      selectedlayers: [],         // Selected layers
      projections:    [],         // projections
      epsg:           null,       // choose epsg project
      added:          false,      // added layer (Boolean)
    }
  },

  components: {
    'chrome-picker': ChromeComponent,
  },

  computed: {

    /**
     * @returns {boolean} check whether current uploaded file has CSV extension
     */
    csv_extension() {
      return 'csv' === this.layer.type;
    },

    /**
     * @FIXME add description
     */
    add() {
      return this.layer.data || this.csv.valid;
    },

    /**
     * @returns {false|*|boolean}
     */
    inputswmsurlvalid() {
      return (
        (
          this.url !== null &&
          this.url.trim() &&
          this.url && this.url.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g) // whether is a valid url
        ) &&
        (
          this.id !== null &&
          this.id.trim()
        )
      )
    },

  },

  methods: {

    onChangeColor(val) {
      this.layer.color = val;
    },

    async onChangeFile(evt) {
      const reader     = new FileReader();
      const name       = evt.target.files[0].name;
      let type         = name.split('.').at(-1).toLowerCase();
      const input_file = $(this.$refs.input_file);

      if (!SUPPORTED_FORMAT.includes(type)) {
        this.error_message = 'sdk.errors.unsupported_format';
        return;
      }

      this.error_message = '';

      this.layer.mapCrs = GUI.getService('map').getEpsg();
      this.layer.name   = name;
      this.layer.title  = name;
      this.layer.id     = name;
      this.layer.type   = type;
      this.layer.data   = await (new Promise((resolve) => {

        // ZIP / KMZ file
        if ( ['zip', 'kmz'].includes(this.layer.type)) {
          //force crs
          this.layer.crs = 'EPSG:4326';
          const data = evt.target.files[0];
          input_file.val(null);
          return resolve(data);
        }

        reader.onload = evt => {

          // CSV file
          if ('csv' === this.layer.type) {
            input_file.val(null);
            const [headers, ...values] = evt.target.result.split(/\r\n|\n/).filter(row => row);
            const handle_csv_headers = separator => {
              this.csv.loading = true;
              const csv_headers = headers.split(separator);
              const len = csv_headers.length;
              this.csv.headers = len > 1 ? csv_headers      : [];
              this.csv.fields  = len > 1 ? csv_headers      : [];
              this.csv.x       = len > 1 ? csv_headers[0]   : this.csv.x;
              this.csv.y       = len > 1 ? csv_headers[1]   : this.csv.y;
              this.vectorLayer = len > 1 ? this.vectorLayer : null;
              this.csv.valid   = len > 1;
              if (len <= 1) {
                this.fields.splice(0);
              }
              this.csv.loading = false;
              return len > 1 ? {
                headers: csv_headers,
                separator,
                x: this.csv.x,
                y: this.csv.y,
                values
              } : null;
            };
            this.$watch('csv.separator', s => this.layer.data = handle_csv_headers(s))
            return resolve(handle_csv_headers(this.csv.separator));
          }

          // OTHER FORMATS
          const data = evt.target.result;
          input_file.val(null);
          resolve(data);
        };
        reader.readAsText(evt.target.files[0]);
      }));

      // skip when ..
      if ('csv' === this.layer.type ) {
        return;
      }

      (this.fields || []).splice(0); // reset fields

      try {
        this.vectorLayer = await createVectorLayerFromFile(this.layer);
        await this.$nextTick();
      } catch(e) {
        console.warn(e);
        this.error_message = 'sdk.errors.add_external_layer';
      }
      
      if (this.vectorLayer) {
        this.fields = this.vectorLayer.get('_fields');
      }

    },

    async addLayer() {

      // skip when ..
      if (!(this.layer.data || this.csv.valid)) {
        return;
      }

      // register EPSG
      try {
        await Projections.registerProjection(this.layer.crs);
      } catch(e) {
        this.error_message = `sdk.errors.${e}`;
        console.warn(e);
        return;
      }

      this.loading = true;

      try {
        this.vectorLayer = await createVectorLayerFromFile(this.layer);
        await GUI.getService('map').addExternalLayer(this.vectorLayer, {
          crs:      this.layer.crs,
          type:     this.layer.type,
          position: this.position,
          color:    this.layer.color,
          field:    this.field,
          persistent: !!this.persistent,
        });
        $(this.$refs.modal_addlayer).modal('hide');
        this.clearFile();
      } catch(e) {
        this.error_message = 'sdk.errors.add_external_layer';
      }

      this.loading = false
    },

    /**
     * @since 3.8.0
     */
    clearFile() {
      this.error_message = '';
      this.loading       = false;
      this.layer.name    = null;
      this.layer.title   = null;
      this.layer.id      = null;
      this.layer.type    = null;
      this.layer.crs     = GUI.getService('map').getCrs();
      this.layer.color   = { hex: '#194d33', rgba: { r: 25, g: 77, b: 51, a: 1 }, a: 1 };
      this.layer.data    = null;
      this.vectorLayer   = null;
      this.fields        = [];
      this.field         = null;
      this.csv.valid     = false;
    },

    clearPanel() {
      this.wms_panel     = false;
      this.selectedlayers = [];
      this.name           = null;
      this.loading        = false;
    },

    /**
     * @returns { Promise<void> }
     */
    async addwmsurl() {
      this.loading           = true;
      const found  = this.localwmsurls.find(l => l.url == wms.url || l.id == wms.id);
      const status = { error: false, added: !!found };
      // when url is not yet added
      if (!found) {
        try {
          const response = await this.getWMSLayers(wms.url);
          // skip on invalid response
          if (!response.result) {
            throw 'invalid response';
          }
          const data = this.getLocalWMSData();
          this.localwmsurls.push(wms);
          data.urls = this.localwmsurls;
          this.updateLocalWMSData(data);
          response.wmsurl = wms.url;
          this._showWmsLayersPanel(response);
        } catch(e) {
          console.warn(e);
          status.error = true;
        }
      }
      this.status.error      = status.error;
      this.status.added      = status.added;
      this.loading           = false;
    },

    /**
     * Delete url from local storage
     * 
     * @param id
     */
    deleteWmsUrl(id) {
      this.localwmsurls       = this.localwmsurls.filter(l => id !== l.id);
      const data              = this.getLocalWMSData();
      data.urls               = this.localwmsurls;
      this.updateLocalWMSData(data);
    },

    /**
     * Add external WMS layer to map
     * 
     * @param { Object } wms
     * @param { string } wms.url
     * @param { string } wms.name
     * @param wms.epsg
     * @param wms.position
     * @param wms.opacity
     * @param wms.visible
     * @param wms.layers
     *
     * @returns {Promise<unknown>}
     */
    _addExternalWMSLayer({
      url,
      layers,
      name,
      epsg     = GUI.getService('map').getEpsg(),
      position = 'top',
      opacity,
      visible  = true
    } = {}) {
      const map             = GUI.getService('map');
      const { RasterLayer } = require('map/layers/imagelayer');
      const projection      = ol.proj.get(epsg);

      const promise = new Promise((res, rej) => {
        const wmslayer = new RasterLayer({ id: name || getUniqueDomId(), layers, projection, url });
        const olLayer  = wmslayer.getOLLayer();
        olLayer.getSource().once('imageloadend', res);
        olLayer.getSource().once('imageloaderror', rej);
        map.addExternalLayer(wmslayer, { position, opacity, visible });
      });
    
      return promise;
    },

    /**
     * Check if a layer is already added to map
     * 
     * @param { Object } wms
     * @param { string } wms.url
     * @param { string } wms.name
     * @param { string } wms.epsg
     * @param { string} wms.position
     * @param wms.opacity
     * @param wms.layers
     * @param {Boolean } wms.visible
     * 
     * @returns { Promise<void> }
     */
    async addWMSlayer({
      url,
      name    = `wms_${getUniqueDomId()}`,
      layers  = [],
      epsg,
      position,
      visible = true,
      opacity = 1,
    } = {}) {

      try {
        // check if WMS already added (by name)
        const data = this.getLocalWMSData();

        if (this.wms_panel) {
          const wms = data.wms[this.url];
          this.added = wms && wms.some(w => w.layers.length === this.selectedlayers.length
            ? this.selectedlayers.every(l => w.layers.includes(l))
            : undefined
          );
          if (this.added) {
            console.warn('WMS Layer already added');
            return;
          }
          this.loading = true;
        }

        const config = { url, name, layers, epsg, position, visible, opacity };

        if (undefined === data.wms[url]) {
          data.wms[url] = [config];
        } else {
          data.wms[url].push(config);
        }

        this.updateLocalWMSData(data);

        try {
          await this._addExternalWMSLayer(config);
        } catch(e) {
          console.warn(e);
          GUI.getService('map').removeExternalLayer(name);
          this.deleteWms(name);
          setTimeout(() => { GUI.showUserMessage({ type: 'warning', message: 'sidebar.wms.layer_add_error' }) });
        }
      } catch(e) {
        console.warn(e);
      }
      if (this.wms_panel) {
        this.clearPanel();
        $('#modal-addlayer').modal('hide');
      }
    },

    /**
     * Get data of wms url from server
     * 
     * @param { string } url
     */
    async getWMSLayers(url) {
      try {
        return await DataRouterService.getData('ows:wmsCapabilities', { inputs: { url }, outputs: false });
      } catch(e) {
        console.warn(e);
      }
      return {
        result:       false,
        layers:       [],
        info_formats: [], // @deprecated since 3.9.0 (inside methods)
        abstract:     null,
        methods:      [], // @since 3.9.0
        map_formats:  [], // @deprecated since 3.9.0 (inside methods)
        title:        null
      };
    },

    /**
     * ORIGINAL SOURCE: src/app/gui/wms/vue/panel/wmslayerspanel.js@3.8.15
     * 
     * show add wms layers to wms panel
     * 
     * @param config
     * 
     * @returns { WmsLayersPanel }
     */
    _showWmsLayersPanel(config = {}) {
      this.wms_panel = true;
      this.wms_config = config;
      const {
        layers,
        title,
        abstract,
        methods, // @since 3.9.0
        wmsurl,
      } = this.wms_config;

      /** URL of wms */
      try {
        this.url = methods.GetMap.urls.find(u => 'Get' === u.type).url;
      } catch(e) {
        console.warn(e);
        this.url = wmsurl;
      }

      /** Title of wms */
      this.title = title;
      
      /** Abstract of wms */
      this.abstract = abstract;

      /** Store for each layer name projection info */
      this.layerProjections = {};

      /* try to check if projection */
      layers
        .forEach(({ name, crss, title }) => {
          this.layerProjections[name] = {
            title,
            crss: crss.map(crs => { Projections.get(crs); return `EPSG:${crs.epsg}`; }).sort(),
          };
        });

      /** Layers of wms */
      this.layers = layers;
    },

    /**
     * Load WMS Data from server and show WMS Layers Panel
     * 
     * @param url
     * 
     * @returns { Promise<void> }
     */
    async showWmsLayersPanel(url) {
      let error = false;
      let added = false;
      try {
        this.loading = true;
        const d = await this.getWMSLayers(url);
        error = !d.result;
        if (!error) {
          d.wmsurl = url;
          this._showWmsLayersPanel(d);
        }
      } catch(e) {
        console.warn(e);
      } finally {
        this.status.error = error;
        this.status.added = added;
        this.loading      = false;
      }
    },

    /**
     * Delete WMS by name
     * 
     * @param name
     */
    deleteWms(name) {
      const data = this.getLocalWMSData();
      Object.keys(data.wms).find(url => {
        const i = data.wms[url].findIndex(w => w.name == name);
        /** @TODO add description */
        if (-1 !== i) {
          data.wms[url].splice(i, 1);
        }
        /** @TODO add description */
        if (-1 !== i && 0 == data.wms[url].length) {
          delete data.wms[url];
        }
        return true;
      });
      this.updateLocalWMSData(data);
    },

    /**
     * Change config of storage layer options as position, opacity
     */
    changeLayerData(name, attr = {}) {
      const data = this.getLocalWMSData();
      Object
        .keys(data.wms)
        .find(url => {
          const i = data.wms[url].findIndex(l => l.name == name);
          if (-1 !== i) {
            data.wms[url][i][attr.key] = attr.value;
            return true;
          }
        });
      this.updateLocalWMSData(data);
    },

    /**
     * Get local storage wms data based on current projectId
     * 
     * @returns {*}
     */
    getLocalWMSData() {
      const item = window.localStorage.getItem('externalwms');
      return ((item ? JSON.parse(item) : undefined) || {})[ApplicationState.project.getId()];
    },

    /**
     * Update local storage data based on changes
     * 
     * @param data
     */
    updateLocalWMSData(data) {
      const item = window.localStorage.getItem('externalwms');
      const alldata = (item ? JSON.parse(item) : undefined) || {};
      alldata[ApplicationState.project.getId()] = data;
      try {
        window.localStorage.setItem('externalwms', JSON.stringify(alldata));
      } catch(e) {
        console.warn(e);
      }
    },

  },

  watch: {

    'csv.x'(value) {
      if (![undefined, null].includes(value)) { this.layer.data.x = value }
    },

    'csv.y'(value) {
      if (![undefined, null].includes(value)) { this.layer.data.y = value }
    },

    /**
     * Handle selected layers change  
     */
    selectedlayers(layers = []) {
      if (0 === layers.length) {             // Reset epsg and projections to initial values
        this.epsg        = null;
        this.projections = [];
      } else if (1 === layers.length) { // take first layer selected supported crss
        this.epsg        = this.layerProjections[layers[0]].crss[0];
        this.projections = this.layerProjections[layers[0]].crss;
      } else {                          // get projections by name
        const name = layers[layers.length -1];
        this.projections = this.projections.filter(p => this.layerProjections[name].crss.includes(p));
      }

    },

    /**
     * @returns { Promise<void> }
     */
    async epsg() {
      await this.$nextTick();
      // Get layers that has current selected epsg projection
      this.layers = (null === this.epsg)
        ? this.wms_config.layers
        : this.layers.filter(({ name }) => this.layerProjections[name].crss.includes(this.epsg))
    },

    layer_type(type) {
      if ('file' == type) {
        this.clearPanel();
      }
    },

    wms_panel(enabled) {
      if(enabled) {
        this.name = this.wms_config.title + ' ' + getUniqueDomId();
      }
    }

  },

  created() {
    this.layer.crs = ApplicationState.project.getProjection().getCode();
  },

  async mounted() {
    await this.$nextTick();

    $('#modal-addlayer').modal('hide');
    $('#modal-addlayer').on('hide.bs.modal',  () => {
      this.layer_type = undefined;
      this.clearFile();
      this.clearPanel();
    });

    // Load WMS urls from local storage

    await GUI.isReady();

    const map = GUI.getService('map');

    await map.isReady();

    this.deleteWms = this.deleteWms.bind(this);

    map.on('remove-external-layer', this.deleteWms);

    let data = this.getLocalWMSData();

    if (undefined === data) {
      data = {
        urls: [], // unique url for wms
        wms:  {}, // object contains url as a key and array of layers bind to url
      };
      this.updateLocalWMSData(data);
    }

    setTimeout(() => {
      map.on('change-layer-position-map', ({ id: name, position } = {}) => this.changeLayerData(name, { key: 'position', value: position }));
      map.on('change-layer-opacity',      ({ id: name, opacity } = {})  => this.changeLayerData(name, { key: 'opacity',  value: opacity }));
      map.on('change-layer-visibility',   ({ id: name, visible } = {})  => this.changeLayerData(name, { key: 'visible',  value: visible }));

      // load eventually data
      Object.keys(data.wms).forEach(url => { data.wms[url].forEach(d => this._addExternalWMSLayer({ url, ...d })); });
    });

    this.localwmsurls = data.urls;
  },

  beforeDestroy() {
    this.clearFile();
    this.clearPanel();
    $('#modal-addlayer').modal('hide')
    $('#modal-addlayer').remove();

    GUI.getService('map').off('remove-external-layer', this.deleteWms);
    this.$data = null;
  },

};
</script>

<style scoped>
  #addcustomlayer {
    margin: 10px 0 10px 0px;
    position: relative;
    border: 2px dashed #97A1A8;
  }

  #addcustomlayer p,
  #addcustomlayer h4 {
    text-align: center;
    line-height: 30px;
    color: #97A1A8;
    font-family: Arial;
  }

  #addcustomlayer div {
    text-align: center;
    line-height: 30px;
    color: #97A1A8;
  }

  #addcustomlayer input{
    position: absolute;
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    outline: none;
    opacity: 0;
    cursor: pointer;
  }
  .g3w-add-wms-url-message{
    font-weight: bold;
    color: #000000;
  }
  .g3w-wmsurl-error {
    background-color: red;
  }
  .g3w-wmsurl-already-added {
    color: inherit;
    font-weight: normal;
    display: inline-block;
  }
  #add_custom_url_wms_input::placeholder {
    font-size: 85%;
    opacity: .5;
  }
  .wms-icon-action {
    font-weight: bold;
    font-size: 1.3em;
    cursor: pointer;
  }
  .g3w-wms-panel-title {
    font-size: 1.2em;
    font-weight: bold;
    margin-bottom: 10px;
  }
  button.wms-add-layer-button {
    width: 100%;
    margin-top: 10px;
  }
  .g3w-wms-external-panel-layer-added-message {
    font-weight: bold;
    color: red;
    margin: 5px 0;
  }
</style>