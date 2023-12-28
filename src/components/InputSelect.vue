<!--
  @file
  @since v3.7
-->

<template>
  <baseinput :state="state">
    <span
      v-if="showPickLayer"
      slot="label-action"
      data-placement="top"
      v-t-tooltip="'sdk.form.inputs.tooltips.picklayer'"
      v-disabled="disabled"
      @click.stop="pickLayerValue"
      style="cursor: pointer; position:relative; top: 2px; font-size: 1.2em"
      :class="g3wtemplate.font['crosshairs']" class="skin-color">
    </span>
    <div
      slot="body"
      v-disabled="disabled"
      :tabIndex="tabIndex"
    >
      <div
        v-if="relationReferenceFields.length > 0"
        class="g3w-relation-reference-fields-content">
        <template v-for="rf in relationReferenceFields">
          <select
            :id="rf.id"
            style="width:100%"
            class="form-control"
          >
            <option
              :value="select2NullValue">
            </option>
            <option
              v-for="value in rf.values"
              :value="getValue(value[0])"
            >
              {{ value[1] }}
            </option>
          </select>
        </template>
        <divider/>
      </div>

      <select
        ref="select"
        style="width:100%"
        class="form-control"
      >
        <option
          v-if="showNullOption"
          :value="select2NullValue">
        </option>
        <option
          v-for="value in state.input.options.values"
          :key="getValue(value.value)"
          :value="getValue(value.value)">
            {{ value.key }}
        </option>
      </select>
    </div>
    <p
      v-if="loadingState === 'error'"
      class="error-input-message"
      slot="message"
      v-t="'server_error'">
    </p>
  </baseinput>
</template>

<script>

import CatalogLayersStoresRegistry from 'store/catalog-layers';
import MapLayersStoresRegistry     from 'store/map-layers';
import GUI                         from 'services/gui';
import {
  selectMixin,
  select2Mixin
}                                  from 'mixins';

const PickLayerInputService  = require('gui/inputs/picklayer/service');
const Layer                  = require('core/layers/layer');
const InputMixin             = require('gui/inputs/input');

const G3W_SELECT2_NULL_VALUE = null; // need to set nul value instead of empty string


function pippo() {

}

export default {

  /** @since 3.8.6 */
  name: 'input-select',

  mixins: [InputMixin, selectMixin, select2Mixin],
  data() {
    return {
      showPickLayer: false,
      picked: false,
      relationReferenceFields: [] // each item is
    }
  },
  computed: {
    /**
     *
     * @returns {boolean}
     */
    showNullOption() {
      return this.state.nullOption === undefined || this.state.nullOption === true;
    },
    /**
     *
     * @returns {false|null}
     */
    select2NullValue() {
      return this.showNullOption && G3W_SELECT2_NULL_VALUE;
    },
  },
  watch: {
    async 'state.input.options.values'(values) {
      await this.$nextTick();
      let changed = false;
      if (!this.autocomplete) {
        let value;
        if (values.length === 0) {
          value = G3W_SELECT2_NULL_VALUE;
        } else {
          const findvalue = values.find(keyvalue => keyvalue.value == this.state.value);
          value = undefined === findvalue ? G3W_SELECT2_NULL_VALUE : findvalue.value;
        }

        changed = value != this.state.value;
        this.state.value = value;
        this.setValue();
      }

      if (changed) {
        this.change();
      }
    }
  },
  methods: {
    /**
     *
     * @returns {Promise<void>}
     */
    async pickLayerValue() {
      try {
        if (this.picked) {
          this.pickLayerInputService.unpick();
          this.picked = false;
        } else {
          this.picked = true;
          const values = await this.pickLayerInputService.pick();
          const { value:field }= this.state.input.options;
          const value = values[field];
          this.select2.val(value).trigger('change');
          this.changeSelect(value);
          GUI.showUserMessage({
            type: 'success',
            autoclose: true
          });
          this.picked = false;
        }
      } catch(err) {
        GUI.showUserMessage({
          type: "warning",
          message: 'sdk.form.inputs.messages.errors.picklayer',
          autoclose: true
        });
        this.picked = false;
      }
    },
    setAndListenSelect2Change() {
      this.select2.on('select2:select', event => {
        let value = event.params.data.$value ?
          event.params.data.$value :
          event.params.data.id;
        value = this.showNullOption ?

          value === G3W_SELECT2_NULL_VALUE ?
            null :
            value.toString() :

          value.toString();

        this.changeSelect(value);
      });
    }
  },

  async created() {
    this.open = false;
    //DEV
    this.state.input.options.fields = ['short_ro', 'diameter'];
    //
    if (this.state.input.options.relation_reference && Array.isArray(this.state.input.options.fields)) {
      this.setLoading(true);
      const promises = [];
      this.state.input.options.fields
        .forEach((f) => {
          this.relationReferenceFields.push({
            id: f, //field name
            values: [], //values
            value: null //current value
          })
        promises.push(
          CatalogLayersStoresRegistry
            .getLayerById('lyr_pipe_mat_345') //DEV
            .getFilterData({
              fformatter: f
            })
          )
      })
      await Promise
        .allSettled(promises)
        .then(responses => {
          responses
            .forEach(({status, value}, i) =>{
              if ('fulfilled' === status) {
                this.relationReferenceFields[i].values = value.data || [];
              }
            })
        })

      this.setLoading(false);
    }
    if (this.state.input.type === 'select_autocomplete') {
      const dependencyLayerId = this.state.input.options.layer_id;
      try {
        const dependencyLayer = MapLayersStoresRegistry
          .getLayerById(dependencyLayerId)
          .getEditingLayer() || CatalogLayersStoresRegistry.getLayerById(dependencyLayerId);
        this.showPickLayer = dependencyLayer ?
          dependencyLayer.getType() !== Layer.LayerTypes.TABLE :
          false;

        const {
          value:field,
          layer_id
        } = this.state.input.options;

        const options = {
          layer_id,
          fields: [field],
          pick_type: dependencyLayer.isStarted && dependencyLayer.isStarted() && 'map' || null
        };

        this.pickLayerInputService = this.showPickLayer && new PickLayerInputService(options);
      } catch(err) {}
    }

    if (this.autocomplete && this.state.value) {
      this.service.getKeyByValue({
        search: this.state.value
      });
    }
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
            })
              .then(values => success(values))
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
    } else {
      this.select2 = selectElement.select2({
        language,
        dropdownParent,
        minimumResultsForSearch: this.isMobile() ? -1 : null
      });
    }
    this.setAndListenSelect2Change();
    this.setValue();
  },
  beforeDestroy() {
    if (this.pickLayerInputService) {
      this.pickLayerInputService.clear();
      this.pickLayerInputService = null;
    }
    this.unwatch && this.unwatch();
    this.unwatch = null;
  }
};
</script>