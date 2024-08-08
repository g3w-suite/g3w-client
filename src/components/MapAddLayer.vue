<!--
  @file
  @since v3.7
-->

<template>
  <!-- Modal -->
  <div
    class = "modal fade"
    id    = "modal-addlayer"
    ref   = "modal_addlayer"
    role  = "dialog"
    >
      <div class = "modal-dialog">
        <!-- Modal content-->
        <div class = "modal-content">
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
          <div class = "modal-body">
            <div class = "form-group">
              <label for="projection-layer" v-t = "'mapcontrols.add_layer_control.select_projection'"></label>
              <select class = "form-control" id = "projection-layer" v-model = "layer.crs">
                <option v-for = "option in options" :value = "option">{{option}}</option>
              </select>
            </div>
            <layerspositions @layer-position-change = "onChangePosition($event)"/>
            <p v-t = "'mapcontrols.add_layer_control.select_color'" style = "font-weight: 700;"></p>
            <chrome-picker
              v-model = "layer.color"
              @input  = "onChangeColor"
              style   ="width:100%; margin:auto"/>
            <bar-loader :loading = "loading"/>
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
            <div
              v-if  = "error_message"
              style = "font-weight: bold; font-size: 1.2em; background-color: orange; padding: 10px; text-align: center"
              v-t   = "error_message">
            </div>
            <div class = "modal-footer">
              <button
                v-t         = "'add'"
                type        = "button"
                class       = "btn btn-success pull-left"
                @click.stop = "addLayer"
                :disabled   = "!add">
              </button>
              <button
                v-t          = "'close'"
                type         = "button"
                class        = "btn btn-default"
                data-dismiss = "modal">
              </button>
            </div>
            </div>
        </div>
      </div>
    </div>
</template>

<script>
import { Chrome as ChromeComponent }        from 'vue-color';

import { EPSG }                             from 'app/constant';
import Projections                          from 'store/projections';
import { createVectorLayerFromFile }        from 'utils/createVectorLayerFromFile';

const SUPPORTED_FORMAT = ['zip','geojson', 'GEOJSON',  'kml', 'kmz', 'KMZ', 'KML', 'json', 'gpx', 'gml', 'csv'];
const CSV_SEPARATORS   = [',', ';'];

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

    // add map crs if not present
    if (!EPSG.includes(this.service.getCrs())) {
      EPSG.unshift(this.service.getCrs())
    }

    return {
      vectorLayer:        null,
      options:            EPSG,
      error_message:      '',
      position:           null,
      loading:            false,
      fields:             [],
      field:              null,
      accepted_extension: SUPPORTED_FORMAT.map(f => `.${f}`).join(','),
      csv: {
        valid:       false,
        loading:     false,
        headers:     [],
        x:           null,
        y:           null,
        separators : CSV_SEPARATORS,
        separator:   CSV_SEPARATORS[0],
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
      }
    }
  },
  components: {
    'chrome-picker': ChromeComponent
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
    }

  },

  methods: {

    onChangePosition(position) {
      this.position = position;
    },

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

      this.layer.mapCrs = this.service.getEpsg();
      this.layer.name   = name;
      this.layer.title  = name;
      this.layer.id     = name;
      this.layer.type   = type;
      this.layer.data   = await (new Promise((resolve) => {

        // ZIP / KMZ file
        if ( ['zip', 'kmz'].includes(this.layer.type)) {
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
        await this.service.addExternalLayer(this.vectorLayer, {
          crs:      this.layer.crs,
          type:     this.layer.type,
          position: this.position,
          color:    this.layer.color,
          field:    this.field,
        });
        $(this.$refs.modal_addlayer).modal('hide');
        this.clear();
      } catch(e) {
        this.error_message = 'sdk.errors.add_external_layer';
      }

      this.loading = false
    },

    /**
     * @since 3.8.0
     */
    clear() {
      this.error_message = '';
      this.loading       = false;
      this.layer.name    = null;
      this.layer.title   = null;
      this.layer.id      = null;
      this.layer.type    = null;
      this.layer.crs     = this.service.getCrs();
      this.layer.color   = { hex: '#194d33', rgba: { r: 25, g: 77, b: 51, a: 1 }, a: 1 };
      this.layer.data    = null;
      this.vectorLayer   = null;
      this.fields        = [];
      this.field         = null;
      this.csv.valid     = false;
    },

  },

  watch: {

    'csv.x'(value) {
      if (![undefined, null].includes(value)) { this.layer.data.x = value }
    },

    'csv.y'(value) {
      if (![undefined, null].includes(value)) { this.layer.data.y = value }
    },

  },

  created() {
    this.layer.crs = this.service.getCrs();
    this.service.on('addexternallayer', () => this.modal.modal('show'));
  },

  async mounted() {
    await this.$nextTick();
    this.modal = $('#modal-addlayer').modal('hide');
    this.modal.on('hide.bs.modal',  () => this.clear() );
  },

  beforeDestroy() {
    this.clear();
    this.modal.modal('hide');
    this.modal.remove();
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
</style>