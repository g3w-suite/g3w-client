<!--
  @file
  
  ORIGINAL SOURCE: src/components/InputSelect.vue@3.8

  @since 3.9.0
-->

<template>
  <g3w-input :state="state">

    <!-- LABEL -->
    <template #input-label-action>
      <span
        v-if           = "showPickLayer"
        data-placement = "top"
        v-t-tooltip    = "'sdk.form.inputs.tooltips.picklayer'"
        v-disabled     = "$parent.disabled"
        @click         = "pickLayerValue"
        :class         = "g3wtemplate.font['crosshairs']"
        class          = "skin-color select-label"
      ></span>
    </template>

    <!-- DROPDOWN -->
    <template #input-body>
      <div
        v-disabled = "$parent.disabled"
        :tabIndex  = "$parent.tabIndex"
      >
        <select
          ref   = "select"
          style = "width: 100%;"
          class = "form-control"
        >
          <option
            v-if   = "showNullOption"
            :value = "select2NullValue"
          ></option>
          <option
            v-for  = "value in state.input.options.values"
            :key   = "getValue(value.value)"
            :value = "getValue(value.value)"
          >{{ value.key }}</option>
        </select>
      </div>
    </template>

    <!-- ERROR TEXT -->
    <template #input-message>
      <p
        v-if  = "'error' === $parent.loadingState"
        class = "error-input-message"
        v-t   = "'server_error'"
      ></p>
    </template>

  </g3w-input>
</template>

<script>
import CatalogLayersStoresRegistry     from 'store/catalog-layers';
import MapLayersStoresRegistry         from 'store/map-layers';
import GUI                             from 'services/gui';
import { selectMixin, select2Mixin }   from 'mixins';

const Layer = require('core/layers/layer');

const G3W_SELECT2_NULL_VALUE = null; // neede to set nul value instead of empty string

export default {

  /** @since 3.8.6 */
  // name: 'input-select',

  mixins: [
    selectMixin,
    select2Mixin
  ],

  data() {
    return {
      showPickLayer: false,
      picked:        false,
    }
  },

  props: {
    state: {
      type: Object,
      required: true,
    },
  },

  computed: {

    showNullOption() {
      return undefined === this.state.nullOption || true === this.state.nullOption;
    },

    select2NullValue() {
      return this.showNullOption && G3W_SELECT2_NULL_VALUE;
    },

  },

  watch: {

    async 'state.input.options.values'(values) {

      await this.$nextTick();

      const found   = !this.autocomplete && 0 !== values.length && values.find(kv => kv.value == this.state.value);
      const value   = found ? found.value : G3W_SELECT2_NULL_VALUE;
      const changed = !this.autocomplete && value != this.state.value;
      
      if (!this.autocomplete) {
        this.state.value = value;
        this.setValue();
      }

      if (changed) {
        this.$parent.change();
      }

    },

  },

  methods: {

    async pickLayerValue() {

      try {
        if (this.picked) {
          this.pickLayerInputService.unpick();
          this.picked  = false;
        } else {
          this.picked  = true;
          const value  = await this.pickLayerInputService.pick()[this.state.input.options.value];
          this.select2.val(value).trigger('change');
          this.changeSelect(value);
          GUI.showUserMessage({ type: 'success', autoclose: true });
          this.picked  = false;
        }
      } catch(err) {
        GUI.showUserMessage({ type: "warning", message: 'sdk.form.inputs.messages.errors.picklayer', autoclose: true });
        this.picked = false;
      }

    },

    setAndListenSelect2Change() {
      this.select2
        .on('select2:select', e => {
          let value = e.params.data.$value ? e.params.data.$value : e.params.data.id;
          this.changeSelect(
            this.showNullOption
              ? G3W_SELECT2_NULL_VALUE === value 
                ? null
                : value.toString()
              : value.toString()
          );
        });
    },

    /**
     * @override selectMixin::changeSelect(value)
     */
    changeSelect(value) {
      this.state.value = ('null' === value ? null : value);
      this.$parent.change();
    },


    /**
     * ORIGINAL SOURCE: src/app/gui/inputs/select/service.js@3.8::getData()
     * 
     * @since 3.9.0
     */
    _getData(opts = {}) {
      const service = this.$parent.getInputService();
      opts          = Object.assign({}, {
        layer_id:  service.getState().input.options.layer_id,
        key:       service.getState().input.options.key,
        value:     service.getState().input.options.value,
        search:    undefined
      }, opts);
      return new Promise((resolve, reject) => {
        if (!this._layer) {
          this._layer = CatalogLayersStoresRegistry.getLayerById(layer_id);
        }
        this._layer
          .getDataTable({
            suggest: `${key}|${search}`.trim(),
            ordering: key
          })
          .then(response => {
            const values = [];
            const features = response.features;
            for (let i = 0; i < features.length; i++) {
              values.push({
                text:features[i].properties[key],
                id: i,
                $value: features[i].properties[value]
              })
            }
            resolve(values);
          })
          .fail(err => reject(err));
      });
    },

  },

  created() {

    this.open = false;

    try {

      if ('select_autocomplete' === this.state.input.type) {
        const { value, layer_id } = this.state.input.options;
        const layer = ( 
          MapLayersStoresRegistry.getLayerById(layer_id).getEditingLayer() ||
          CatalogLayersStoresRegistry.getLayerById(layer_id)
        );
        this.showPickLayer = layer
          ? layer.getType() !== Layer.LayerTypes.TABLE
          : false;
        this.pickLayerInputService = this.showPickLayer && this.$parent.createInputService('picklayer', {
          layer_id,
          fields: [value],
          pick_type: (layer.isStarted && layer.isStarted() && 'map' || null)
        });
      }

      // ORIGINAL SOURCE: src/app/gui/inputs/select/service.js@3.8::getKeyByValue()
      if (this.autocomplete && this.state.value) {
        const service = this.$parent.getInputService();
        const options = service.getState().input.options;
        const { value, key } = options;

        this
          ._getData({
              key:    value,
              value:  key,
              search: service.getValue()
          })
          .then(d => {
            options.values.push({ key: d[0].$value, value: d[0].text }); // add value
          })
          .catch(err => console.log(err));
      }

    } catch(e) {
        console.warn(e);
    }
  },

  async mounted() {

    await this.$nextTick();

    this.unwatch;

    const selectElement  = $(this.$refs.select);
    const language       =  this.getLanguage();
    const dropdownParent = (undefined === this.state.dropdownParent && $('#g3w-view-content'));

    const opts = this.autocomplete
      ? ({
          minimumInputLength: 1,
          dropdownParent,
          allowClear: this.showNullOption,
          language,
          ajax: {
            delay: 250,
            transport: (params, success, failure) => {
              // hide previous result if present
              $('.select2-results__option.loading-results').siblings().hide();
              this.resetValues();
              this
                ._getData({ search: params.data.term })
                .then(success)
                .catch(failure);
            },
            processResults: (data, params) => {
              params.page = params.page || 1;
              return {
                results: data,
                pagination: {
                  more: false,
                }
              };
            }},
      })
      : ({
        language,
        dropdownParent,
        minimumResultsForSearch: (this.isMobile() ? -1 : null),
      });

    this.select2 = selectElement.select2(opts);

    this.setAndListenSelect2Change();
    this.setValue();

  },

  beforeDestroy() {

    if (this.pickLayerInputService) {
      this.pickLayerInputService.clear();
      this.pickLayerInputService = null;
    }

    if (this.unwatch) {
      this.unwatch();
    }

    this.unwatch = null;
  },

};
</script>

<style scoped>
  .select-label {
    
    cursor: pointer;
    position:relative;
    top: 2px;
    font-size: 1.2em
  }
</style>