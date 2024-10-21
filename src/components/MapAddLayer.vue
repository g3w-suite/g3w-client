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
            class = "modal-title"
          ></h4>
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

            <!-- WMS URL -->
            <div class = "form-group" v-disabled="wms_panel">
              <label for = "add_custom_url_wms_input" title = "required" v-t="'URL'"></label>
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
                required
              />
              <datalist id="wms_urls">
                <option v-for = "wms in wms_urls" :key  = "wms.id" :value="wms.url">{{ wms.id }}</option>
              </datalist>
            </div>

            <!-- WMS NAME -->
            <div v-if="url && !wms_panel" class = "form-group" v-disabled="wms_panel || wms_urls.some(l => l.url == url)">
              <label for = "add_custom_name_url_wms_input" title = "required">
                <span v-t = "'sidebar.wms.panel.label.name'"></span>
                <i style = "font-family: Monospace;color: var(--skin-color);">*</i>
              </label>
              <input
                id           = "add_custom_name_url_wms_input"
                v-model.trim = "id"
                class        = "form-control"
                required
              />
            </div>

            <!-- SUBMIT BUTTON -->
            <button
              v-if                = "!wms_panel"
              v-disabled          = "wms_panel || !(id || '').trim() || !(url || '').trim().match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g)"
              @click.prevent.stop = "addWmsURL"
              class               = "btn btn-block btn-success form-group"
            ><b :class = "$fa('plus-square')"></b> <span v-t="'connect_to_wms'"></span></button>

            <!-- LIST OF WMS LAYERS (STORED ON LOCAL STORAGE) -->
            <div v-if="!wms_panel" class="form-group">
              <div
                v-for = "wms in wms_urls"
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
                    :class                 = "$fa('eye')"
                    style                  = "color: var(--skin-color); padding: 3px; margin: 2px; font-size: 1.3em; cursor: pointer;"
                  ></i>

                  <!-- DELETE WMS -->
                  <i
                    @click.stop            = "deleteWmsUrl(wms.id)"
                    v-t-tooltip:top.create = "'sidebar.wms.delete_wms_url'"
                    :class                 = "$fa('trash')"
                    style                  = "color: red; padding: 3px; margin: 2px; font-size: 1.3em; cursor: pointer;"
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
              <fieldset v-if="wms_config.abstract" class="form-group" style="border: 1px solid #c0c0c0; padding: 4.9px 8.75px 8.75px 10.5px;border-radius: 3px;">
                <legend style="width: 15px;height: 15px;border: 1px solid;border-radius: 50%;background-color: #222d32;font-weight: bold;color: #fff;font-size: 0.7em; text-align: center; margin: 0 -14px;user-select: none;">i</legend>
                <span v-t = "wms_config.abstract"></span>
              </fieldset>

              <!-- LAYERS NAME   -->
              <label for = "g3w-wms-layers" v-t = "'sidebar.wms.panel.label.layers'"></label>
              <select id = "g3w-wms-layers" :multiple = "true" :clear = "true" v-select2 = "'wms_layers'">
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

            </div>

          </template>

          <template v-if="'file' === layer_type">

            <!-- LAYER PROJECTION -->
            <div class = "form-group" v-disabled = "['kmz', 'zip'].includes(layer.type)">
              <label for="projection-layer" v-t = "'mapcontrols.add_layer_control.select_projection'"></label>
              <select class = "form-control" id = "projection-layer" v-model = "layer.crs">
                <option v-for = "crs in new Set([map_crs, 'EPSG:3003','EPSG:3004', 'EPSG:3045', 'EPSG:3857', 'EPSG:4326', 'EPSG:6708', 'EPSG:23032', 'EPSG:23033', 'EPSG:25833', 'EPSG:32632', 'EPSG:32633'])">{{ crs }}</option>
              </select>
            </div>

            <!-- LAYER POSITION -->
            <div class = "form-group">
              <label for="position-layer" v-t = "'layer_position.message'"></label>
              <select class = "form-control" id = "position-layer" v-model = "position">
                <option :value = "'top'"    v-t = "'layer_position.top'"></option>
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
                @change = "onChangeFile($event)"
                accept  = ".zip,.geojson,.GEOJSON,.kml,.kmz,.KMZ,.KML,.json,.gpx,.gml,.csv"
              />
              <h4 v-t="'mapcontrols.add_layer_control.drag_layer'"></h4>
              <h4
                v-if  = "layer.name"
                class = "skin-color"
                style = "font-weight: bold">{{ layer.name }}</h4>
              <i :class      = "g3wtemplate.getFontClass('cloud-upload')" class = "fa-5x" aria-hidden = "true"></i>
              <span>[.gml, .geojson, .kml, .kmz ,.gpx, .csv, .zip(shapefile)]</span>
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
              <label v-t = "'mapcontrols.add_layer_control.select_field_to_show'" for = "g3w-select-field-layer"></label>
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

          <!-- ERROR NOTICE -->
          <div
            v-if  = "error_message"
            style = "font-weight: bold; font-size: 1.2em; background-color: orange; padding: 10px; text-align: center"
            v-t   = "error_message">
          </div>

          <button
            v-t          = "'close'"
            type         = "button"
            class        = "btn btn-default"
            data-dismiss = "modal"
          ></button>

          <!-- SUBMIT BUTTON -->
          <button
            v-t         = "'add'"
            type        = "button"
            class       = "btn btn-success"
            @click.stop = "addLayer"
            v-disabled  = "'wms' === layer_type ? !wms_layers.length : !add"
          ></button>

          </div>

      </div>
    </div>
  </div>
</template>

<script>
import { Chrome as ChromeComponent } from 'vue-color';

import ApplicationState              from 'store/application';
import Projections                   from 'store/projections';
import GUI                           from 'services/gui';
import DataRouterService             from 'services/data';
import { createVectorLayerFromFile } from 'utils/createVectorLayerFromFile';
import { getUniqueDomId }            from 'utils/getUniqueDomId';

export default {

  /** @since 3.8.6 */
  name: 'map-add-layer',

  data() {

    return {
      layer_type:         undefined,
      wms_panel:          false,
      wms_urls:           [], // array of object {id, url}
      wms_layers:         [], // Selected layers
      url:                null,
      id:                 null,
      vectorLayer:        null,
      map_crs:            ApplicationState.project.getProjection().getCode(),
      position:           'top', // layer position on map
      persistent:         false,
      loading:            false, // loading reactive status
      fields:             [],
      field:              null,
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
          hex:  '#194d33',
          rgba: { r: 25, g: 77, b: 51, a: 1, },
          a:    1,
        },
        data:     null,
        visible:  true,
        title:    null,
        id:       null,
        external: true,
      },
      name:          undefined,  // name of saved layer
      title:         null,       // title of layer
      methods:       [],         // @since 3.9.0
      layers:        [],         // Array of layers
      projections:   [],         // projections
      epsg:          null,       // choose epsg project
      added:         false,      // added layer (Boolean)
      error_message: '',
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

      if (!input_file.attr('accept').split(',').includes(`.${type}`)) {
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
      this.loading = true;

      if ('wms' === this.layer_type) {
        const name = (this.name || `wms_${getUniqueDomId()}`).trim();

        try {
          // check if WMS already added (by name)
          const data  = this.getLocalWMSData();
          const found = this.wms_panel && (data.wms[this.url] || []).some(wms => wms.layers.length === this.wms_layers.length && this.wms_layers.every(l => wms.layers.includes(l)));

          if (found) {
            this.showWmsLayersPanel(this.url)
          }

          const config = {
            url:      this.url,
            name,
            layers:   this.wms_layers,
            epsg:     this.epsg,
            position: this.position,
            visible:  true,
            opacity:  1,
          };

          data.wms[this.url] = data.wms[this.url] || [];
          data.wms[this.url].push(config);

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
      }

      if ('file' === this.layer_type && (this.layer.data || this.csv.valid)) {
        // register EPSG
        try {
          await Projections.registerProjection(this.layer.crs);
        } catch(e) {
          this.error_message = `sdk.errors.${e}`;
          console.warn(e);
          return;
        }
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
      }
      this.loading = false;
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
      this.error_message  = '';
      this.wms_panel      = false;
      this.wms_layers     = [];
      this.name           = null;
      this.loading        = false;
    },

    /**
     * @returns { Promise<void> }
     */
    async addWmsURL() {
      this.loading = true;
      const wms    = { url: this.url, id: this.id };
      const found  = this.wms_urls.find(l => l.url == this.url || l.id == wms.id);
      // when url is not yet added
      if (found) {
        this.showWmsLayersPanel(this.url)
      } else {
        try {
          const response = await this.getWMSLayers(this.url);
          // skip on invalid response
          if (!response.result) {
            throw 'invalid response';
          }
          const data = this.getLocalWMSData();
          this.wms_urls.push(wms);
          data.urls = this.wms_urls;
          this.updateLocalWMSData(data);
          response.wmsurl = wms.url;
          this._showWmsLayersPanel(response);
        } catch(e) {
          console.warn(e);
          this.error_message = e;
        }
      }
      this.loading = false;
    },

    /**
     * Delete url from local storage
     * 
     * @param id
     */
    deleteWmsUrl(id) {
      this.wms_urls = this.wms_urls.filter(l => id !== l.id);
      const data    = this.getLocalWMSData();
      data.urls     = this.wms_urls;
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
        abstract:     null,
        methods:      [], // @since 3.9.0
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
      try {
        this.loading = true;
        const d = await this.getWMSLayers(url);
        if (!d.result) {
          throw $t('server_error');
        }
        d.wmsurl = url;
        this._showWmsLayersPanel(d);
      } catch(e) {
        this.error_message = e;
        console.warn(e);
      } 
      this.loading = false;
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
    wms_layers(layers = []) {
      if (0 === layers.length) {        // Reset epsg and projections to initial values
        this.epsg        = null;
        this.projections = [];
      } else if (1 === layers.length) { // take first layer selected supported crss
        this.epsg        = this.layerProjections[layers.at(-1)].crss[0];
        this.projections = this.layerProjections[layers.at(-1)].crss;
      } else {                          // get projections by name
        this.projections = this.projections.filter(p => this.layerProjections[layers.at(-1)].crss.includes(p));
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
      if ('file' === type) {
        this.clearPanel();
      }
    },

    url() {
      if (this.url && !this.wms_panel && this.wms_urls.some(l => l.url == this.url)) {
        this.id = this.wms_urls.find(l => l.url == this.url).id
      }
    },

    wms_panel() {
      if (this.wms_panel) {
        this.name = this.wms_config.title + ' ' + getUniqueDomId();
      }
    },

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

    this.wms_urls = data.urls;
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
    display: flex;
    flex-direction:
    column;
    text-align: center;
    gap: 8px;
    padding: 20px 0;
    opacity: .8;
  }
  #addcustomlayer input {
    position: absolute;
    outline: none;
    opacity: 0;
    cursor: pointer;
    inset: 0;
  }
  #add_custom_url_wms_input::placeholder {
    font-size: 85%;
    opacity: .5;
  }
  .g3w-wms-panel-title {
    font-size: 1.2em;
    font-weight: bold;
    margin-bottom: 10px;
  }
</style>