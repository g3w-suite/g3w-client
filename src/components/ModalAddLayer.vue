<!--
  @file
  @since 3.11.0
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

          <!-- LAYER TYPE -->
          <div class="form-group">
            <label v-t="'layer_type'"></label>
            <select id="add-layer-type" class = "form-control" v-model="layer_type">
              <option disabled :value="undefined" v-t="'choose_type'"></option>
              <option value="wms"  v-t="'remote_wms_url'"></option>
              <option value="file" v-t="'local_file'"></option>
            </select>
          </div>

          <hr>

          <!-- LOADING INDICATOR -->
          <bar-loader :loading = "loading"/>

          <div v-if = "'wms' === layer_type" class = "form-group">

            <!-- DOCS -->
            <a
              :href  = "`https://g3w-suite.readthedocs.io/en/v3.7.x/g3wsuite_client.html#wms`"
              target = "_blank"
              style  = "float: right;"
              title  = "Docs"
            >
              <i :class = "$fa('external-link')"></i>
            </a>

            <!-- WMS URL -->
            <div class = "form-group" v-disabled="wms_config">
              <label for = "add_custom_url_wms_input">URL</label>
              <input
                id           = "add_custom_url_wms_input"
                v-model.trim = "url"
                class        = "form-control"
                placeholder  = "http://example.org/?&service=WMS&request=GetCapabilities"
                type         = "url"
                list         = "wms_urls"
                required
              />
              <small v-if="!wms_config" v-t="'add_new_wms_url_help'"></small>
              <datalist id="wms_urls">
                <option v-for = "wms in wms_urls" :key  = "wms.id" :value="wms.url">{{ wms.id }}</option>
              </datalist>
            </div>

            <!-- WMS NAME -->
            <div v-if="url && !wms_config && !loading" class = "form-group" v-disabled="wms_config || wms_urls.some(l => l.url == url)">
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
              <p v-if = "wms_urls.some(l => l.id === id) && wms_urls.every(l => l.url !== url)" style="color: red; margin: 10px 0;">
                ⚠️ <b v-t = "'sidebar.wms.layer_id_already_added'"></b>
              </p>
            </div>

            <!-- SUBMIT BUTTON -->
            <button
              v-if                = "!wms_config"
              v-disabled          = "!(id || '').trim() || wms_urls.some(l => l.id === id && l.url !== url) || !(url || '').trim().match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g)"
              @click.prevent.stop = "addWmsURL"
              class               = "btn btn-block btn-success"
            ><b :class = "$fa('plus-square')"></b> <span v-t="'connect_to_wms'"></span></button>

            <!-- LIST OF SAVED CONNECTIONS (from local storage) -->
            <div v-if="!wms_config" class="form-group">
              <hr>
              <div v-for = "wms in wms_urls" :key = "wms.id" style = "border-bottom: 1px solid #ccc; padding-bottom: 3px;">
                <div style = "display: flex; justify-content: space-between; align-items: center; padding-top: 3px">
                  <b style = "flex-grow: 1;">{{ wms.id }}</b>
                  <i @click.stop = "fetchWMS(wms.url)"    v-t-tooltip:top.create = "'connect_to_wms'"             :class = "$fa('eye')"   style = "color: var(--skin-color); padding: 3px; margin: 2px; font-size: 1.3em; cursor: pointer;"></i>
                  <i @click.stop = "deleteWmsUrl(wms.id)" v-t-tooltip:top.create = "'sidebar.wms.delete_wms_url'" :class = "$fa('trash')" style = "color: red; padding: 3px; margin: 2px; font-size: 1.3em; cursor: pointer;"></i>
                </div>
                <small>{{ wms.url }}</small>
              </div>
            </div>

            <div v-if = "wms_config" v-disabled = "loading">

              <button
                type                   = "button"
                class                  = "close"
                style                  = "float: right; padding: 5px 10px; margin-top: -5px;outline: 1px solid; color: red; opacity: 1;"
                @click                 = "unloadWMS"
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
                <option v-for = "l in layers" :key = "l.name" :value = "l.name">{{ l.title }}</option>
              </select>

              <!-- EPSG PROJECTIONS   -->
              <label for = "g3w-wms-projections" v-t = "'sidebar.wms.panel.label.projections'"></label>
              <select id = "g3w-wms-projections" v-select2 = "'epsg'">
                <option v-for = "p in projections">{{ p }}</option>
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

          </div>

          <div v-if = "'file' === layer_type" class = "form-group">

            <button
              v-if                   = "layer_data"
              type                   = "button"
              class                  = "close"
              style                  = "float: right; padding: 5px 10px; margin: 5px 0 0 8px;outline: 1px solid; color: red; opacity: 1;"
              @click                 = "unloadFile"
              v-t-tooltip:left.create = "'sidebar.wms.delete_wms_url'"
            >&times;</button>

            <!-- FILE UPLOAD -->
            <form id = "addcustomlayer" :style="{ padding: layer_data ? '0' : '20px 0' }">
              <input
                ref     = "input_file"
                type    = "file"
                @change = "parseFile"
                accept  = ".zip,.geojson,.GEOJSON,.kml,.kmz,.KMZ,.KML,.json,.gpx,.gml,.csv"
              />
              <h4 class = "skin-color">
                <b v-if="!layer_data" v-t="'mapcontrols.add_layer_control.drag_layer'"></b>
                <b v-else-if = "layer_name">{{ layer_name }}</b>
              </h4>
              <i v-if="!layer_data" :class = "g3wtemplate.getFontClass('cloud-upload')" class = "fa-5x" aria-hidden = "true"></i>
              <span v-if="!layer_data" style="font-family: Monospace;">.gml, .geojson, .kml, .kmz, .gpx, .csv, .zip (shapefile)</span>
            </form>

            <!-- CSV FILE (parsing options) -->
            <div v-if = "'csv' === file_type" class = "form-group" style = "padding: 15px; border: 1px solid grey; border-radius: 3px">
              <bar-loader :loading = "csv_loading"/>

              <label v-t = "'mapcontrols.add_layer_control.select_csv_separator'" for = "g3w-select-field-layer"></label>
              <select id = "g3w-select-separator" class = "form-control" v-model = "csv_separator" @change="parseFile">
                <option>,</option>
                <option>;</option>
              </select>

              <label v-t = "'mapcontrols.add_layer_control.select_csv_x_field'" for = "g3w-select-x-field"></label>
              <select id = "g3w-select-x-field" class = "form-control" v-model = "csv_x" :disabled = "!(fields || []).length" @change="parseFile">
                <option v-for = "h in fields">{{ h }}</option>
              </select>

              <label v-t = "'mapcontrols.add_layer_control.select_csv_y_field'" for = "g3w-select-y-field"></label>
              <select id = "g3w-select-y-field" class = "form-control" v-model = "csv_y" :disabled = "!(fields || []).length" @change="parseFile">
                <option v-for = "h in fields">{{ h }}</option>
              </select>
            </div>

            <div v-if = "parse_errors.length" class="form-group">
              <label for="csv_parse_errors">⚠️ Parse errors:</label>
              <select id="csv_parse_errors" class="form-control" style="background-color: gold;font-family: Monospace;">
                <option v-for="({ value, row }) in parse_errors">[{{ row }}] {{ value }}</option>
              </select>
            </div>

            <!-- LAYER PROJECTION -->
            <div v-if="layer_data" class = "form-group" v-disabled = "['kmz', 'zip'].includes(file_type)">
              <label for="projection-layer" v-t = "'mapcontrols.add_layer_control.select_projection'"></label>
              <select class = "form-control" id = "projection-layer" v-model = "layer_crs">
                <option v-for = "crs in new Set([map_crs, 'EPSG:3003','EPSG:3004', 'EPSG:3045', 'EPSG:3857', 'EPSG:4326', 'EPSG:6708', 'EPSG:23032', 'EPSG:23033', 'EPSG:25833', 'EPSG:32632', 'EPSG:32633'])">{{ crs }}</option>
              </select>
            </div>

            <!-- LAYER POSITION -->
            <div v-if="layer_data" class = "form-group">
              <label for="position-layer" v-t = "'layer_position.message'"></label>
              <select class = "form-control" id = "position-layer" v-model = "position">
                <option :value = "'top'"    v-t = "'layer_position.top'"></option>
                <option :value = "'bottom'" v-t = "'layer_position.bottom'"></option>
              </select>
            </div>

            <!-- PERSISTENT LAYER  -->
            <div v-if="layer_data" class = "form-group">
              <label for="persistent-layer" v-t = "'mapcontrols.add_layer_control.persistent_data'"></label>
              <select class = "form-control" id = "persistent-layer" v-model = "persistent">
                <option :value = "false" v-t = "'no'"></option>
                <option :value = "true" v-t = "'yes'"></option>
              </select>
              <small v-t = "'mapcontrols.add_layer_control.persistent_help'"></small>
            </div>

            <!-- LAYER LABEL (visible field) -->
            <div v-if="(fields || []).length" class="form-group">
              <label v-t = "'label'" for = "g3w-select-field-layer"></label>
              <select id = "g3w-select-field-layer" class = "form-control" v-model = "field">
                <option :value = "null">---</option>
                <option v-for = "f in fields" :key = "f" :value = "f">{{ f }}</option>
              </select>
              <small v-t = "'mapcontrols.add_layer_control.select_field_to_show'"></small>
            </div>

            <!-- LAYER COLOR  -->
            <div v-if="layer_data">
              <p v-t = "'mapcontrols.add_layer_control.select_color'" style = "font-weight: 700;"></p>
              <chrome-picker
                v-model = "layer_color"
                @input  = "onChangeColor"
                style   ="width:100%;"
              />
            </div>

          </div>

        </div>

        <!-- MODAL FOOTER -->
        <div class = "modal-footer">

          <!-- ERROR NOTICE -->
          <div
            v-if  = "error_message"
            style = "font-weight: bold; font-size: 1.2em; background-color: orange; padding: 10px; text-align: center"
            v-t   = "error_message">
          </div>

          <!-- CLOSE BUTTON -->
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
            v-disabled  = "'wms' === layer_type ? !wms_layers.length : !layer_data"
          ></button>

          </div>

      </div>
    </div>
  </div>
</template>

<script>
import { Chrome as ChromeComponent } from 'vue-color';

import { GEOMETRY_FIELDS } from 'g3w-constants';
import ApplicationState    from 'store/application';
import Projections         from 'store/projections';
import GUI                 from 'services/gui';
import { getUniqueDomId }  from 'utils/getUniqueDomId';
import { XHR }             from 'utils/XHR';
import ol from 'assets/vendors/ol/js/ol';

const { RasterLayer } = require('map/layers/imagelayer');

Object
  .entries({
    RasterLayer,
  })
  .forEach(([k, v]) => console.assert(undefined !== v, `${k} is undefined`));

export default {

  /** @since 3.11.0 */
  name: 'modal-addlayer',

  data() {

    return {
      layer_type:      undefined,
      file_type:       null,
      layer_name:      null,
      layer_crs:       ApplicationState.project.getProjection().getCode(),
      layer_color: {
        hex:  '#194d33',
        rgba: { r: 25, g: 77, b: 51, a: 1, },
        a:    1,
      },
      wms_config:      null,
      wms_urls:        [], // array of object {id, url}
      wms_layers:      [], // Selected layers
      url:             null,
      id:              null,
      olLayer:         null,
      map_crs:         ApplicationState.project.getProjection().getCode(),
      position:        'top', // layer position on map
      persistent:      false,
      loading:         false, // loading reactive status
      fields:          [],
      field:           null,
      csv_x:           null,
      csv_y:           null,
      csv_separator:   ',',
      csv_loading:     false,
      name:            undefined,  // name of saved layer
      title:           null,       // title of layer
      layers:          [],         // Array of layers
      projections:     [],         // projections
      epsg:            null,       // choose epsg project
      error_message:   '',
      parse_errors:    [],
    }
  },

  components: {
    'chrome-picker': ChromeComponent,
  },

  watch: {

    /**
     * Handle selected layers change  
     */
    wms_layers(layers = []) {
      if (0 === layers.length) {        // Reset epsg and projections to initial values
        this.epsg        = null;
        this.projections = [];
      } else if (1 === layers.length) { // take first layer selected supported crss
        this.epsg        = this.wms_projections[layers.at(-1)].crss[0];
        this.projections = this.wms_projections[layers.at(-1)].crss;
      } else {                          // get projections by name
        this.projections = this.projections.filter(p => this.wms_projections[layers.at(-1)].crss.includes(p));
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
        : this.layers.filter(({ name }) => this.wms_projections[name].crss.includes(this.epsg))
    },

    async layer_type(type, oldtype) {
      // if (type && oldtype) {
      //   this.layer_type = undefined;
      //   await this.$nextTick();
      //   this.layer_type = type;
      // }
      if ('file' === oldtype) {
        this.unloadFile();
      }
      if ('wms' === oldtype) {
        this.unloadWMS();
      }
    },

    url() {
      if (this.url && !this.wms_config && this.wms_urls.some(l => l.url == this.url)) {
        this.id = this.wms_urls.find(l => l.url == this.url).id
      }
    },

  },

  methods: {

    onChangeColor(val) {
      this.layer_color = val;
    },

    async parseFile() {
      const input = this.$refs.input_file;

      // skip invalid formats
      if (!input.accept.split(',').includes(`.${input.files[0].name.split('.').at(-1).toLowerCase()}`)) {
        this.error_message = 'sdk.errors.unsupported_format';
        return;
      }

      try {

        this.error_message = '';
        this.parse_errors  = [];
        this.layer_name    = input.files[0].name;
        this.file_type     = input.files[0].name.split('.').at(-1).toLowerCase();
        this.layer_data    = null;

        const epsg   = ['zip', 'kml', 'kmz'].includes(this.file_type) ? 'EPSG:4326' : this.layer_crs;
        let features = [];
        let data;

        (this.fields || []).splice(0); // reset fields

        // KMZ file
        if ('kmz' === this.file_type) { 
          this.layer_crs  = 'EPSG:4326';
          const zip = new JSZip();
          zip.load(await input.files[0].arrayBuffer(input.files[0]));
          data = zip.file(/.kml$/i).at(-1).asText(); // get last kml file within folder
        }

        // SHAPE FILE
        if ('zip' === this.file_type) {
          this.layer_crs  = 'EPSG:4326';
          data = JSON.stringify(await shp(await input.files[0].arrayBuffer(input.files[0]))); // un-zip folder data 
        }

        // CSV file
        if ('csv' === this.file_type) {
          this.csv_loading           = true;
          const [headers, ...values] = (await input.files[0].text()).split(/\r\n|\n/).filter(Boolean);
          this.fields                = headers.split(this.csv_separator);
          const X    = ['x', 'lng', 'longitude', 'longitudine'];
          const Y    = ['y', 'lat', 'latitude', 'latitudine'];
          const x    = this.fields.find(f => X.includes(f.toLowerCase()));
          const y    = this.fields.find(f => Y.includes(f.toLowerCase()));
          this.csv_x = this.csv_x || x || this.fields[0]; // auto suggest "csv_x" field
          this.csv_y = this.csv_y || y || this.fields[1]; // auto suggest "csv_y" field
          data = this.fields.length > 1 ? values : null;
          data.forEach((row, i) => {
            const cols = row.split(this.csv_separator);
            if (cols.length !== this.fields.length) {
              return this.parse_errors.push({ row: i + 1, value: data[i] });
            }
            const coords = this.fields.flatMap((field, i) => (field === this.csv_x || field === this.csv_y) ? Number(cols[i]) : []);
            // check if all coordinates are right
            if (!coords.some(d => Number.isNaN(d))) {
              const feat = new ol.Feature({
                geometry: (new ol.geom.Point(coords)).transform(this.layer_crs, GUI.getService('map').getEpsg()),
                ...cols.reduce((props, value, i) => Object.assign(props, { [this.fields[i]]: value }, {}))
              });
              feat.setId(i); // incremental id
              features.push(feat);
            }
          });
          this.csv_loading = false;
        }

        // other files
        if (!data) {
          data = await input.files[0].text() || {};
        }

        // parse features
        if ('csv' !== this.file_type) {
          features = ({
            'gpx'    : new ol.format.GPX(),
            'gml'    : new ol.format.WMSGetFeatureInfo(),
            'geojson': new ol.format.GeoJSON(),
            'zip'    : new ol.format.GeoJSON(),
            'kml'    : new ol.format.KML({ extractStyles: false }),
            'kmz'    : new ol.format.KML({ extractStyles: false }),
          })[this.file_type].readFeatures(data, {
            dataProjection: epsg,
            featureProjection: GUI.getService('map').getEpsg() || epsg
          });
        }

        // ignore kml property [`<styleUrl>`](https://developers.google.com/kml/documentation/kmlreference)
        if (['kml', 'kmz'].includes(this.file_type)) {
          features.forEach(f => f.unset('styleUrl'));
        }

        if (features.length) {
          this.olLayer = new ol.layer.Vector({
            source: new ol.source.Vector({ features }),
            name:   this.layer_name,
            id:     getUniqueDomId(),
          });
          this.fields = 'csv' === this.file_type ? this.fields : Object.keys(features[0].getProperties()).filter(prop => GEOMETRY_FIELDS.indexOf(prop) < 0);
        }

        this.layer_data = data;

      } catch(e) {
        console.warn(e);
        this.error_message = 'sdk.errors.add_external_layer';
      }
    },

    async addLayer() {
      this.loading = true;

      if ('wms' === this.layer_type) {
        const name = (this.name || `wms_${getUniqueDomId()}`).trim();

        try {
          // check if WMS already added (by name)
          const data  = this.getLocalWMSData();
          const found = this.wms_config && (data.wms[this.url] || []).some(wms => wms.layers.length === this.wms_layers.length && this.wms_layers.every(l => wms.layers.includes(l)));

          if (found) {
            await this.fetchWMS(this.url);
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
            this.deleteWMS(name);
            setTimeout(() => { GUI.showUserMessage({ type: 'warning', message: 'sidebar.wms.layer_add_error' }) });
          }
        } catch(e) {
          console.warn(e);
        }
        if (this.wms_config) {
          this.unloadWMS();
          $('#modal-addlayer').modal('hide');
        }
      }

      if ('file' === this.layer_type) {
        // register EPSG
        try {
          await Projections.registerProjection(this.layer_crs);
        } catch(e) {
          console.warn(e);
          this.error_message = `sdk.errors.${e}`;
          return;
        }
        try {
          await GUI.getService('map').addExternalLayer(this.olLayer, {
            crs:        this.layer_crs,
            position:   this.position,
            color:      this.layer_color,
            field:      this.field,
            persistent: !!this.persistent,
          });
          $(this.$refs.modal_addlayer).modal('hide');
          this.unloadFile();
        } catch(e) {
          console.warn(e);
          this.error_message = 'sdk.errors.add_external_layer';
        }
      }
      this.loading = false;
    },

    unloadFile() {
      this.error_message = '';
      this.parse_errors  = [];
      this.loading       = false;
      this.layer_name    = null;
      this.file_type     = null;
      this.layer_crs     = GUI.getService('map').getCrs();
      this.layer_color   = { hex: '#194d33', rgba: { r: 25, g: 77, b: 51, a: 1 }, a: 1 };
      this.layer_data    = null;
      this.olLayer       = null;
      this.fields        = [];
      this.field         = null;
      this.csv_x         = null;
      this.csv_y         = null;
    },

    unloadWMS() {
      this.error_message  = '';
      this.wms_config      = null;
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
        await this.fetchWMS(this.url);
      } else {
        await this.fetchWMS();
        const data = this.getLocalWMSData();
        this.wms_urls.push(wms);
        data.urls = this.wms_urls;
        this.updateLocalWMSData(data);
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
      return new Promise((res, rej) => {
        const wmslayer = new RasterLayer({ id: name || getUniqueDomId(), layers, projection: ol.proj.get(epsg), url });
        const olLayer  = wmslayer.getOLLayer();
        olLayer.getSource().once('imageloadend', res);
        olLayer.getSource().once('imageloaderror', rej);
        GUI.getService('map').addExternalLayer(wmslayer, { position, opacity, visible });
      });
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
    async fetchWMS(url) {
      this.loading = true;
      try {
        this.loading = false;
        const config = await XHR.post({
          url:         `${window.initConfig.interfaceowsurl}`,
          contentType: 'application/json',
          data:        JSON.stringify({ url: url || this.url, service: "wms" })
        });

        // skip on invalid response
        if (!config.result) {
          throw 'invalid response';
        }

        config.wmsurl = url || this.url;

        /** URL of wms */
        if (config.methods && config.methods.GetMap) {
          this.url = (config.methods.GetMap.urls || []).find(u => 'Get' === u.type).url;
        } else {
          this.url = config.wmsurl;
        }

        /** Title of wms */
        this.title = config.title;
        this.name  = config.title + ' ' + getUniqueDomId();

        /** Store for each layer name projection info */
        this.wms_projections = config.layers.reduce((projections, { name, crss, title }) => {
          projections[name] = {
            title,
            crss: crss.map(crs => { Projections.get(crs); return `EPSG:${crs.epsg}`; }).sort(),
          };
          return projections;
        }, {});

        /** Layers of wms */
        this.layers = config.layers;

        this.wms_config = config;
      } catch(e) {
        console.warn(e);
        this.error_message = e;
      }
      this.loading = false;
    },

    /**
     * Delete WMS by name
     * 
     * @param name
     */
    deleteWMS(name) {
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

  async mounted() {
    $('#modal-addlayer').modal('hide');
    $('#modal-addlayer').on('hide.bs.modal',  () => {
      this.layer_type = undefined;
      this.url        = null;
      this.id         = null;
      this.unloadFile();
      this.unloadWMS();
    });

    await GUI.isReady();
    await GUI.getService('map').isReady();

    this.deleteWMS = this.deleteWMS.bind(this);

    GUI.getService('map').on('remove-external-layer', this.deleteWMS);

    // Load WMS urls from local storage

    let data = this.getLocalWMSData();

    if (undefined === data) {
      data = {
        urls: [], // unique url for wms
        wms:  {}, // object contains url as a key and array of layers bind to url
      };
      this.updateLocalWMSData(data);
    }

    setTimeout(() => {
      const map = GUI.getService('map');
      map.on('change-layer-position-map', ({ id: name, position } = {}) => this.changeLayerData(name, { key: 'position', value: position }));
      map.on('change-layer-opacity',      ({ id: name, opacity } = {})  => this.changeLayerData(name, { key: 'opacity',  value: opacity }));
      map.on('change-layer-visibility',   ({ id: name, visible } = {})  => this.changeLayerData(name, { key: 'visible',  value: visible }));

      // load eventually data
      Object.keys(data.wms).forEach(url => { data.wms[url].forEach(d => this._addExternalWMSLayer({ url, ...d })); });
    });

    this.wms_urls = data.urls;
  },

  beforeDestroy() {
    this.unloadFile();
    this.unloadWMS();
    $('#modal-addlayer').modal('hide')
    $('#modal-addlayer').remove();

    GUI.getService('map').off('remove-external-layer', this.deleteWMS);
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