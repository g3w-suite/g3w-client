<!--
  @file
  @since v3.7
-->

<template>
  <!-- Modal -->
  <div class="modal fade" id="modal-addlayer" ref="modal_addlayer" role="dialog">
    <div class="modal-dialog">
      <!-- Modal content-->
      <div class="modal-content">
        <div class="modal-header">
          <button type="button" class="close" data-dismiss="modal">&times;</button>
          <h4 style="font-weight: bold" v-t="'mapcontrols.add_layer_control.header'" class="modal-title"></h4>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label v-t="'mapcontrols.add_layer_control.select_projection'" for="projection-layer"></label>
            <select class="form-control" id="projection-layer" v-model="layer.crs">
              <option v-for="option in options" :value="option">{{option}}</option>
            </select>
          </div>
          <layerspositions @layer-position-change="setLayerMapPosition($event)"></layerspositions>
          <p v-t="'mapcontrols.add_layer_control.select_color'" style="font-weight: 700;"></p>
          <chrome-picker
            v-model="layer.color"
            @input="onChangeColor"
            style="width:100%; margin:auto"
          ></chrome-picker>
          <bar-loader :loading="loading"/>
          <form id="addcustomlayer">
            <input ref="input_file" type="file" title=" " @change="onAddLayer($event)" :accept="accepted_extension">
            <h4 v-t="'mapcontrols.add_layer_control.drag_layer'"></h4>
            <h4 class="skin-color" style="font-weight: bold" v-if="layer.name">{{ layer.name }}</h4>
            <div>
              <i :class="g3wtemplate.getFontClass('cloud-upload')" class="fa-5x" aria-hidden="true"></i>
            </div>
            <p style="font-weight: bold">[.gml, .geojson, .kml, .kmz ,.gpx, .csv, .zip(shapefile)]</p>
          </form>
          <div v-if="csv_extension" style="padding: 15px; border: 1px solid grey; border-radius: 3px">
            <bar-loader :loading="csv.loading"/>
            <div class="select_field">
              <label v-t="'mapcontrols.add_layer_control.select_csv_separator'" for="g3w-select-field-layer"></label>
              <select class="form-control" id="g3w-select-separator" v-model="csv.separator">
                <option v-for="separator in csv.separators" :key="separator" :value="separator">{{ separator }}</option>
              </select>
            <div class="select_field" :class="{'g3w-disabled': !csv.headers || csv.headers.length === 0}">
              <label v-t="'mapcontrols.add_layer_control.select_csv_x_field'" for="g3w-select-x-field"></label>
              <select class="form-control" id="g3w-select-x-field" v-model="csv.x">
                <option v-for="header in csv.headers" :key="header" :value="header">{{ header }}</option>
              </select>
            </div>
            <div class="select_field" :class="{'g3w-disabled': !csv.headers || csv.headers.length === 0}">
              <label v-t="'mapcontrols.add_layer_control.select_csv_y_field'" for="g3w-select-y-field"></label>
              <select class="form-control" id="g3w-select-y-field" v-model="csv.y">
                <option v-for="header in csv.headers" :key="header" :value="header">{{ header }}</option>
              </select>
            </div>
          </div>
          </div>
          <div class="select_field" :class="{'g3w-disabled': !fields || fields.length === 0}">
            <label v-t="'mapcontrols.add_layer_control.select_field_to_show'" for="g3w-select-field-layer"></label>
            <select class="form-control" id="g3w-select-field-layer" v-model="field">
              <option :value="null">---</option>
              <option v-for="field in fields" :key="field" :value="field">{{ field }}</option>
            </select>
          </div>
          <div style="font-weight: bold; font-size: 1.2em; background-color: orange; padding: 10px; text-align: center" v-if="error" v-t="error_message"></div>
          <div class="modal-footer">
          <button v-t="'add'" type="button" class="btn btn-success pull-left" @click.stop="addLayer" :disabled="!add"></button>
          <button v-t="'close'" type="button" class="btn btn-default" data-dismiss="modal"></button>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<script>
import { Chrome as ChromeComponent } from 'vue-color';

import { EPSG } from 'app/constant';

const Projections = require('g3w-ol/projection/projections');

const { createVectorLayerFromFile, createStyleFunctionToVectorLayer } = require('utils/geo');

const SUPPORTED_FORMAT = ['zip','geojson', 'GEOJSON',  'kml', 'kmz', 'KMZ', 'KML', 'json', 'gpx', 'gml', 'csv'];
const CSV_SEPARATORS = [',', ';'];

//Vue color componet
ChromeComponent.mounted = async function() {
  await this.$nextTick();    // remove all the tihing that aren't useful
  $('.vue-color__chrome__toggle-btn').remove();
  $('.vue-color__editable-input__label').remove();
  $('.vue-color__chrome__saturation-wrap').css('padding-bottom','100px');
  $('.vue-color__chrome').css({
    'box-shadow': '0 0 0 0',
    'border': '1px solid #97A1A8'
  });
};

export default {

  /** @since 3.8.6 */
  name: 'map-add-layer',

  props: ['service'],
  data() {
    //add map crs if not present
    const MAPEPSG = this.service.getCrs();
    EPSG.find(epsg => epsg === MAPEPSG) === undefined && EPSG.unshift(MAPEPSG);
    return {
      vectorLayer: null,
      options: EPSG,
      error: false,
      error_message: null,
      position: null,
      loading: false,
      fields:[],
      field: null,
      accepted_extension: SUPPORTED_FORMAT.map(format => `.${format}`).join(','),
      csv: {
        valid: false,
        loading:false,
        headers: [],
        x: null,
        y: null,
        separators : CSV_SEPARATORS,
        separator: CSV_SEPARATORS[0],
      },
      layer: {
        name: null,
        type: null,
        crs: null,
        mapCrs: null,
        color: {
          hex: '#194d33',
          rgba: {
            r: 25,
            g: 77,
            b: 51,
            a: 1
          },
          a: 1
        },
        data: null,
        visible: true,
        title: null,
        id: null,
        external: true,
      }
    }
  },
  components: {
    'chrome-picker': ChromeComponent
  },
  computed:{

    /**
     * @returns {boolean} check whether current uploaded file has CSV extension
     */
    csv_extension() {
      return this.layer.type === 'csv';
    },

    /**
     * @FIXME add description
     */
    add() {
      return this.layer.data || this.csv.valid;
    }

  },
  methods: {
    setLayerMapPosition(position){
      this.position = position;
    },
    setError(type){
      this.error_message = `sdk.errors.${type}`;
      this.error = true;
    },
    clearError(){
      this.error = false;
      this.error_message = null;
    },
    onChangeColor(val) {
      this.layer.color = val;
    },
    async onAddLayer(evt) {
      const reader = new FileReader();
      const name = evt.target.files[0].name;
      let type = evt.target.files[0].name.split('.');
      type = type[type.length-1].toLowerCase();
      const input_file = $(this.$refs.input_file);
      if (SUPPORTED_FORMAT.indexOf(type) !== -1) {
        this.clearError();
        this.layer.mapCrs = this.service.getEpsg();
        this.layer.name = name;
        this.layer.title = name;
        this.layer.id = name;
        this.layer.type = type;
        if (this.layer.type === 'csv') { // in case of csv
          reader.onload = evt => {
            input_file.val(null);
            const csv_data = evt.target.result.split(/\r\n|\n/).filter(row => row);
            const [headers, ...values] = csv_data;
            const handle_csv_headers = separator => {
              let data = null;
              this.csv.loading = true;
              const csv_headers = headers.split(separator);
              const headers_length = csv_headers.length;
              if (headers_length > 1) {
                this.csv.headers = csv_headers;
                this.fields = csv_headers;
                this.csv.x = csv_headers[0];
                this.csv.y = csv_headers[1];
                data = {
                  headers: csv_headers,
                  separator,
                  x: this.csv.x,
                  y: this.csv.y,
                  values
                };
                this.csv.valid = true;
              } else {
                this.csv.headers = this.fields = [];
                this.vectorLayer = null;
                this.csv.valid = false;
                this.fields.splice(0);
              }
              this.csv.loading = false;
              return data;
            };
            this.layer.data = handle_csv_headers(this.csv.separator);
            this.$watch('csv.separator', separator => this.layer.data = handle_csv_headers(separator))
          };
          reader.readAsText(evt.target.files[0]);
        } else {
          const promiseData = new Promise((resolve, reject) =>{
            if (this.layer.type === 'zip'
              || this.layer.type === 'kmz') { // in case of shapefile (zip file)
              const data = evt.target.files[0];
              input_file.val(null);
              resolve(data);
            } else {
              reader.onload = evt => {
                const data = evt.target.result;
                input_file.val(null);
                resolve(data);
              };
              reader.readAsText(evt.target.files[0]);
            }
          });
          this.layer.data = await promiseData;
          try {
            this.fields.splice(0); //reset eventually the fields
            await this.createVectorLayer();
            this.fields = this.vectorLayer.get('_fields');
          } catch(err){}
        }
      } else this.setError('unsupported_format');
    },
    async createVectorLayer(){
      try {
        this.vectorLayer = await createVectorLayerFromFile(this.layer);
        await this.$nextTick();
      } catch(err){this.setError('add_external_layer');}
    },
    async addLayer() {
      if (this.layer.data || this.csv.valid) {
        const {crs} = this.layer;
        try {
          /**
           * waiting to register a epsg choose if all go right
           */
          try {
            await Projections.registerProjection(crs);
          } catch(error) {
            this.setError(error);
            return;
          }

          this.loading = true;
          this.vectorLayer = await createVectorLayerFromFile(this.layer);
          this.vectorLayer.setStyle(createStyleFunctionToVectorLayer({
            color: this.layer.color,
            field: this.field
          }));
          await this.service.addExternalLayer(this.vectorLayer, {
            crs: this.layer.crs,
            type: this.layer.type,
            position: this.position
          });
          $(this.$refs.modal_addlayer).modal('hide');
          this.clear();

        } catch(err){
          this.setError('add_external_layer');
        }
        this.loading = false
      }
    },

    /**
     * @since 3.8.0
     */
    clear() {
      this.clearError();
      this.loading     = false;
      this.layer.name  = null;
      this.layer.title = null;
      this.layer.id    = null;
      this.layer.type  = null;
      this.layer.crs   = this.service.getCrs();
      this.layer.color = {
        hex: '#194d33',
        rgba: { r: 25, g: 77, b: 51, a: 1 },
        a: 1
      };
      this.layer.data  = null;
      this.vectorLayer = null;
      this.fields      = [];
      this.field       = null;
      this.csv.valid   = false;
    },

    /**
     * @deprecated since v3.8.0. Will be removed in v3.9. Use `clear()` method instead.
     */
    clearLayer() {
      this.clear();
    }

  },
  watch:{
    'csv.x'(value){
      if (value) this.layer.data.x = value
    },
    'csv.y'(value){
      if (value) this.layer.data.y = value
    }
  },
  created() {
    this.layer.crs = this.service.getCrs();
    this.service.on('addexternallayer', () => this.modal.modal('show'));
  },
  async mounted(){
    await this.$nextTick();
    this.modal = $('#modal-addlayer').modal('hide');
    this.modal.on('hide.bs.modal',  () => {
      this.clear();
    });
  },
  beforeDestroy() {
    this.clear();
    this.modal.modal('hide');
    this.modal.remove();
  }
};
</script>