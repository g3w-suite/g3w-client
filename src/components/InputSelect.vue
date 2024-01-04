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
        v-if="filterFields.length > 0 && isFilterFieldsReady"
        class="g3w-relation-reference-fields-content">
        <template v-for="(rf, index) in filterFields">
          <select
            v-select2="'filterFields'"
            :select2_value="rf.value"
            :indexItem="index"
            :id="rf.id"
            style="width:100%"
            class="form-control"
            :disabled="rf.disabled"
            :ref="`filterField_${rf.id}`"
          >
            <option
              v-for="({key, value}) in rf.values"
              :value="getValue(value)"
            >
              {{ key }}
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
          v-for="({key, value}) in state.input.options.values"
          :key="getValue(value)"
          :value="getValue(value)">
            {{ key }}
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

import CatalogLayersStoresRegistry    from 'store/catalog-layers';
import MapLayersStoresRegistry        from 'store/map-layers';
import GUI                            from 'services/gui';
import ProjectsRegistry               from 'store/projects';
import {
  selectMixin,
  select2Mixin
}                                     from 'mixins';

const { createSingleFieldParameter }  = require('utils');
const PickLayerInputService           = require('gui/inputs/picklayer/service');
const Layer                           = require('core/layers/layer');
const InputMixin                      = require('gui/inputs/input');

const G3W_SELECT2_NULL_VALUE = null; // need to set nul value instead of empty string

export default {

  /** @since 3.8.6 */
  name: 'input-select',

  mixins: [InputMixin, selectMixin, select2Mixin],
  data() {
    return {
      showPickLayer: false,
      picked: false,
      filterFields: [], // each item is
      isFilterFieldsReady : false
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

  async created() {
    this.open = false;
    const {
      filter_fields=[],
      relation_reference,
      relation_id,
      chain_filters=false, /** @type Boolean if true filter_fields select are related ech other*/
    } = this.state.input.options;
    //In case of relation reference check if filter_fields is set
    if (relation_reference && relation_id && filter_fields.length > 0) {
      //set loading true
      this.setLoading(true);
			/** {Boolean} @type it used to show component when all data are ready*/
      this.isFilterFieldsReady        = false;

      const {
        referencedLayer,
        referencingLayer,
        fieldRef:{referencingField, referencedField}
      }                               = ProjectsRegistry.getCurrentProject().getRelationById(relation_id);

      const layer                     = CatalogLayersStoresRegistry.getLayerById(referencingLayer)
      const relationLayer             = CatalogLayersStoresRegistry.getLayerById(referencedLayer);
      const relationLayerFields       = relationLayer.getFields();
      const relationLayerFieldsValues = filter_fields.reduce((a, f) => {
        a[f] = `${G3W_SELECT2_NULL_VALUE}`;
        return a;
      }, {});
      //check if it has a value
      if (null !== this.state.value) {

        try {
          //get single feature to set value of filter_fields
          const {data:rdata=[]} = await relationLayer.getFilterData({
            formatter: 0,
            field: createSingleFieldParameter({
              field: referencedField[0],
              value: this.state.value
            })
          })
					
		      //get all data referencing to al filter_fields values
          const {data=[]} = await layer.getFilterData({
		        fformatter: referencingField[0],
		        order: referencingField[0],
            ffield: Object
              .keys(relationLayerFieldsValues)
              .map(f => {
                //get value of filter_field from feature response
                relationLayerFieldsValues[f] = rdata[0].features[0].get(f);
                return createSingleFieldParameter({
                  field: f,
                  value: relationLayerFieldsValues[f]
                })
              }).join('|AND,')
          });
					//set values of select
          this.state.input.options.values = data.map(([value, key]) => ({key, value}));
					
          //set up filterFields
          filter_fields
		        .forEach((f, i) => {
              this.filterFields.push({
                id: f, //field name
                values: [
                  {
                    key: `[${relationLayerFields.find(_f => _f.name === f).label}]`,
                    value:`${G3W_SELECT2_NULL_VALUE}` //null
                  }
                ], //values
                value: relationLayerFieldsValues[f], //current value
                disabled: chain_filters && i > 0 && 'null' === relationLayerFieldsValues[filter_fields[i-1]],
             })
          });

					//in case of chain_filters
          if (chain_filters) {
            //first filter field need to get all value avery time
            const filter_field_data = await relationLayer.getFilterData({
	            unique: filter_fields[0],
		          ordering: filter_fields[0],
	            formatter: 0,
            });
						
            //set all values
            filter_field_data.forEach(v => this.filterFields[0].values.push({key:v, value:v}));

            (await Promise.allSettled(
              filter_fields.slice(1).map((f,i) => {
                return relationLayer.getFilterData({
                  unique: filter_fields[i+1],
		              ordering: filter_fields[i+1],
                  formatter: 0,
                  field: this.filterFields.slice(0, i+1)
                    .filter((f) => 'null' !== f.value)
                    .map((f) => createSingleFieldParameter({
                      field: f.id,
                      value: f.value
                    })).join('|AND,')
                })
              })
            ))
		          .forEach(({status, value:data}, i) => {
                if ('fulfilled' === status) {
                  data.forEach(v => this.filterFields[i+1].values.push({key:v, value: v}));
                }
              })
          } else {
            //No chain filters
            (
              await Promise.allSettled(filter_fields.map(f => relationLayer.getFilterData({unique: f, ordering: f, formatter: 0,})))
            )
		          .forEach(({status, value:data}, index) => {
                if ('fulfilled' === status) {
                  //set values for all filer fields
                  data.forEach(v => this.filterFields[index].values.push({key:v, value:v}));
                }
            });
          }
        } catch(err) {
          console.warn(err);
        }
      }
      else {
        //sett all values for all filter fields
        (await Promise.allSettled(
          filter_fields
            .map((f, i) => {
              this.filterFields.push({
                id: f, //field name
                values: [
                  {
                    key: `[${relationLayerFields.find(_f => _f.name === f).label}]`,
                    value:`${G3W_SELECT2_NULL_VALUE}` //null
                  }
                ], //values
                value: `${G3W_SELECT2_NULL_VALUE}`, //current value
                disabled: chain_filters && i > 0,
              })
		          return relationLayer.getFilterData({
                unique: f,
                formatter: 0,
                ordering: f
              });
            })
        ))
		      .forEach(({status, value:data}, i) => {
            if ('fulfilled' === status) {
              data.forEach(v => this.filterFields[i].values.push({key:v, value:v}))
            }
          });
      }

			//watch change of value
      this.filterFieldsUnwatches = this.filterFields.map((f, index) => {
        return this.$watch(
          () => f.value, // listen change of value
          async (value) => {
            //set loading true
            this.setLoading(true);
		        // in case of chain_filters
            if (chain_filters) {
              //need to be disabled fields in chain after current index
              for (let i = index + 1; i < this.filterFields.length; i++) {
                this.filterFields[i].value = 'null';
                this.filterFields[i].values = [this.filterFields[i].values[0]];
                this.filterFields[i].disabled = 'null' === value;
              }
              try {
                const filter = this.filterFields
                  .slice(0, index + 1)
                  .filter((f) => 'null' !== f.value)
                  .map((f) => createSingleFieldParameter({
                    field: f.id,
                    value: f.value
                  })).join('|AND,');

                const {data: rdata = []} = await relationLayer.getFilterData({field: filter});

                if (rdata[0] && rdata[0].features) {
                  const filterReferencedFieldValues = [];
                  rdata[0].features.forEach((f => {
                    filterReferencedFieldValues.push(f.get(referencedField));
                    if (index < this.filterFields.length - 1) {
                      const value = f.get(this.filterFields[index + 1].id)
                      this.filterFields[index + 1].values.push({
                        key: value,
                        value: value
                      });
                    }
                  }))
                }
              } catch (err) {
                console.warn(err);
              }
            }
            
            const {data = []} = await layer.getFilterData({
              fformatter: referencingField[0],
		          ordering: referencingField[0],
              ffield:  this.filterFields
                .filter((f) => 'null' !== f.value)
                .map((f) => createSingleFieldParameter({
                  field: f.id,
                  value: f.value
                })).join('|AND,')
            })

            this.state.input.options.values = data.map(([value, key]) => ({key, value}))

            if (this.state.input.options.values.length > 0) {
              this.state.value = this.state.input.options.values[0].value;
              this.select2.val(this.state.value).trigger('change');
              this.changeSelect(this.state.value);
            }
            
            //set loading false
            this.setLoading(false);
          })
      })
      
      //stop loading
      this.setLoading(false);
      //filter fields are ready
      this.isFilterFieldsReady = true;
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
    if (this.filterFieldsUnwatches) {
      this.filterFieldsUnwatches.forEach(uw => uw());
    }
    this.filterFieldsUnwatches = null;
  }
};
</script>