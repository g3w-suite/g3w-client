<!--
  @file
  @since v3.7
-->

<template>
  <g3w-input :state="state">

    <!-- LABEL -->
    <span
      v-if           = "showPickLayer"
      slot           = "label-action"
      data-placement = "top"
      v-t-tooltip    = "'sdk.form.inputs.tooltips.picklayer'"
      v-disabled     = "disabled"
      @click         = "pickLayerValue"
      style          = "
        cursor: pointer;
        position:relative;
        top: 2px;
        font-size: 1.2em
      "
      :class         = "g3wtemplate.font['crosshairs']"
      class          = "skin-color"
    ></span>

    <!-- DROPDOWN -->
    <div
      slot       = "body"
      v-disabled = "disabled"
      :tabIndex  = "tabIndex"
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

    <!-- ERROR TEXT -->
    <p
      v-if  = "'error' === loadingState"
      class = "error-input-message"
      slot  = "message"
      v-t   = "'server_error'"
    ></p>

  </g3w-input>
</template>

<script>
import CatalogLayersStoresRegistry                    from 'store/catalog-layers';
import MapLayersStoresRegistry                        from 'store/map-layers';
import GUI                                            from 'services/gui';
import { baseInputMixin, selectMixin, select2Mixin }   from 'mixins';

const Layer = require('core/layers/layer');

const G3W_SELECT2_NULL_VALUE = null; // neede to set nul value instead of empty string

export default {

  /** @since 3.8.6 */
  name: 'input-select',

  mixins: [
    baseInputMixin,
    selectMixin,
    select2Mixin
  ],

  data() {
    return {
      showPickLayer: false,
      picked:        false,
    }
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
      let changed = false;
      if (!this.autocomplete) {
        let value = G3W_SELECT2_NULL_VALUE;
        if (values.length !== 0) {
          const findvalue = values.find(keyvalue => keyvalue.value == this.state.value);
          value = findvalue ? findvalue.value : value;
        }
        changed          = value != this.state.value;
        this.state.value = value;
        this.setValue();
      }
      if (changed) {
        this.change();
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
          const values = await this.pickLayerInputService.pick();
          const value  = values[this.state.input.options.value];
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

  },

  created() {

    this.open = false;

    if ('select_autocomplete' === this.state.input.type) {
      try {
        const { value, layer_id } = this.state.input.options;
        const layer = ( 
          MapLayersStoresRegistry.getLayerById(layer_id).getEditingLayer() ||
          CatalogLayersStoresRegistry.getLayerById(layer_id)
        );
        this.showPickLayer = layer
          ? layer.getType() !== Layer.LayerTypes.TABLE
          : false;
        this.pickLayerInputService = this.showPickLayer && this.createInputService('picklayer', {
          layer_id,
          fields: [value],
          pick_type: (layer.isStarted && layer.isStarted() && 'map' || null)
        });
      } catch(e) {
        console.warn(e);
      }
    }

    if (this.autocomplete && this.state.value) {
      this.service.getKeyByValue({ search: this.state.value });
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
              this.service
                .getData({ search: params.data.term })
                .then(d => success(d))
                .catch(e => failure(e));
            },
            processResults: (data, params) => {
              params.page = params.page || 1;
              return {
                results: data,
                pagination: {
                  more: false
                }
              };
            }},
      })
      : ({
        language,
        dropdownParent,
        minimumResultsForSearch: (this.isMobile() ? -1 : null)
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