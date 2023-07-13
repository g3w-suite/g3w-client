<!--
  @file
  @since v3.7
-->

<template>
  <baseinput :state="state">
    <span slot="label-action" data-placement="top" v-t-tooltip="'sdk.form.inputs.tooltips.picklayer'" v-disabled="disabled"
      @click="pickLayerValue" v-if="showPickLayer" style="cursor: pointer; position:relative; top: 2px; font-size: 1.2em"
      :class="g3wtemplate.font['crosshairs']" class="skin-color">
    </span>
    <div slot="body" v-disabled="disabled" :tabIndex="tabIndex">
      <select ref="select" style="width:100%;"  class="form-control">
        <option v-if="showNullOption" :value="select2NullValue"></option>
        <option :value="getValue(value.value)" v-for="value in state.input.options.values" :key="getValue(value.value)">{{ value.key }}</option>
      </select>
    </div>
    <p v-if="loadingState === 'error'" class="error-input-message" slot="message" v-t="'server_error'"></p>
  </baseinput>
</template>

<script>
import CatalogLayersStoresRegistry from 'store/catalog-layers';
import MapLayersStoresRegistry from 'store/map-layers';
import GUI from 'services/gui';
import { selectMixin, select2Mixin } from 'mixins';

const PickLayerInputService = require('gui/inputs/picklayer/service');
const Layer = require('core/layers/layer');
const InputMixin = require('gui/inputs/input');

const G3W_SELECT2_NULL_VALUE = null; // neede to set nul value instead of empty string

export default {

  /** @since 3.8.6 */
  name: 'input-select',

  mixins: [InputMixin, selectMixin, select2Mixin],
  data() {
    return {
      showPickLayer: false,
      picked: false
    }
  },
  computed:{
    showNullOption(){
      return this.state.nullOption === undefined || this.state.nullOption === true;
    },
    select2NullValue(){
      return this.showNullOption && G3W_SELECT2_NULL_VALUE;
    },

  },
  watch: {
    async 'state.input.options.values'(values) {
      await this.$nextTick();
      let changed = false;
      if (!this.autocomplete) {
        let value;
        if (values.length === 0) value = G3W_SELECT2_NULL_VALUE;
        else {
          const findvalue = values.find(keyvalue => keyvalue.value == this.state.value);
          if (!findvalue) value = G3W_SELECT2_NULL_VALUE;
          else value = findvalue.value;
        }
        changed = value != this.state.value;
        this.state.value = value;
        this.setValue();
      }
      changed && this.change();
    }
  },
  methods: {
    async pickLayerValue(){
      try {
        if (this.picked){
          this.pickLayerInputService.unpick();
          this.picked = false;
        } else {
          this.picked = true;
          const values = await this.pickLayerInputService.pick();
          const {value:field}= this.state.input.options;
          const value = values[field];
          this.select2.val(value).trigger('change');
          this.changeSelect(value);
          GUI.showUserMessage({
            type: 'success',
            autoclose: true
          });
          this.picked = false;
        }
      } catch(err){
        GUI.showUserMessage({
          type: "warning",
          message: 'sdk.form.inputs.messages.errors.picklayer',
          autoclose: true
        });
        this.picked = false;
      }
    },
    setAndListenSelect2Change(){
      this.select2.on('select2:select', event => {
        let value = event.params.data.$value ? event.params.data.$value : event.params.data.id;
        value = this.showNullOption ? value === G3W_SELECT2_NULL_VALUE ? null : value.toString() : value.toString();
        this.changeSelect(value);
      });
    }
  },
  created() {
    this.open = false;
    if (this.state.input.type === 'select_autocomplete') {
      const dependencyLayerId = this.state.input.options.layer_id;
      try {
        const dependencyLayer = MapLayersStoresRegistry.getLayerById(dependencyLayerId).getEditingLayer() || CatalogLayersStoresRegistry.getLayerById(dependencyLayerId);
        this.showPickLayer = dependencyLayer ? dependencyLayer.getType() !== Layer.LayerTypes.TABLE : false;
        const {value:field, layer_id} = this.state.input.options;
        const options = {
          layer_id,
          fields: [field],
          pick_type: dependencyLayer.isStarted && dependencyLayer.isStarted() && 'map' || null
        };
        this.pickLayerInputService = this.showPickLayer && new PickLayerInputService(options);
      } catch(err) {}
    }
    this.autocomplete && this.state.value && this.service.getKeyByValue({
      search: this.state.value
    });
  },
  async mounted() {
    await this.$nextTick();
    this.unwatch;
    const selectElement = $(this.$refs.select);
    const language =  this.getLanguage();
    const dropdownParent = this.state.dropdownParent === undefined && $('#g3w-view-content');
    if (this.autocomplete) {
      this.select2 = selectElement.select2({
        minimumInputLength: 1,
        dropdownParent,
        allowClear: this.showNullOption,
        language,
        ajax: {
          delay: 250,
          transport: (params, success, failure) => {
            const search = params.data.term;
            // hide previous result if present
            $('.select2-results__option.loading-results').siblings().hide();
            this.resetValues();
            this.service.getData({
              search
            }).then(values => success(values))
              .catch(err => failure(err))
          },
          processResults: (data, params) => {
            params.page = params.page || 1;
            return {
              results: data,
              pagination: {
                more: false
              }
            }
          }},
      });
    } else this.select2 = selectElement.select2({
          language,
          dropdownParent,
          minimumResultsForSearch: this.isMobile() ? -1 : null
        });
    this.setAndListenSelect2Change();
    this.setValue();
  },
  beforeDestroy() {
    if (this.pickLayerInputService){
      this.pickLayerInputService.clear();
      this.pickLayerInputService = null;
    }
    this.unwatch && this.unwatch();
    this.unwatch = null;
  }
};
</script>