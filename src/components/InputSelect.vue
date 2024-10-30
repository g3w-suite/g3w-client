<!--
  @file
  @since v3.7
-->

<template>
  <baseinput :state = "state">
    <span
      v-if                      = "showPickLayer"
      slot                      = "label-action"
      v-t-tooltip:top.create    = "'sdk.form.inputs.tooltips.picklayer'"
      v-disabled                = "disabled"
      @click.stop               = "pickLayerValue"
      class                     = "g3w-input-pick-layer skin-color"
    >
      <i :class = "g3wtemplate.font['crosshairs']"></i>
    </span>
    <div
      slot       = "body"
      v-disabled = "disabled"
      :tabIndex  = "tabIndex"
    >
      <!-- RELATION REFERENCE FILTER FIELDS SECTION @since 3.9.1 -->
      <div
        v-if  = "filterFields.length > 0 && isFilterFieldsReady"
        class = "g3w-relation-reference-fields-content"
      >
        <template v-for="(rf, index) in filterFields">
          <select
            v-select2      = "'filterFields'"
            :select2_value = "rf.value"
            :indexItem     = "index"
            :id            = "rf.id"
            style          = "width:100%"
            class          = "form-control"
            :disabled      = "rf.disabled"
            :ref           = "`filterField_${rf.id}`"
          >
            <option
              v-for  = "({key, value}) in rf.values"
              :value = "getValue(value)"
            >
              {{ key }}
            </option>
          </select>
        </template>
        <divider/>
      </div>
      <!-- INPUT SELECT -->
      <select
        ref   = "select"
        style = "width:100%"
        class = "form-control"
      >
        <!-- NULL OPTION -->
        <option
          v-if   = "showNullOption"
          :value = "select2NullValue">
        </option>

        <option
          v-for  = "({ key, value }) in state.input.options.values"
          :key   = "getValue(value)"
          :value = "getValue(value)">
            {{ key }}
        </option>
      </select>
    </div>
    <p
      slot  = "message"
      v-if  = "'error' === loadingState "
      class = "error-input-message"
      v-t   = "'server_error'">
    </p>
  </baseinput>
</template>

<script>
  import GUI                            from 'services/gui';
  import ApplicationState               from 'store/application'
  import {
    selectMixin,
    select2Mixin
  }                                     from 'mixins';
  import { createSingleFieldParameter } from 'utils/createSingleFieldParameter';
  import { getCatalogLayerById }        from 'utils/getCatalogLayerById';

  const PickLayerInputService           = require('gui/inputs/picklayer/service');
  const { Layer }                       = require('map/layers/layer');
  const InputMixin                      = require('gui/inputs/input');

  const G3W_SELECT2_NULL_VALUE = null; // need to set nul value instead of empty string

  export default {

    /** @since 3.8.6 */
    name: 'input-select',

    mixins: [InputMixin, selectMixin, select2Mixin],
    data() {
      return {
        showPickLayer :       false,
        picked :              false,
        filterFields :        [], // each item is
        isFilterFieldsReady : false, /**{Boolean} @type it is used to show filter_fields select whe ready*/
      }
    },
    computed: {
      /**
       *
       * @returns {boolean}
       */
      showNullOption() {
        /**
         * In case of multiple select values, need to set doesn't show null value
         */
        return false === this.multiple && [undefined, true].includes(this.state.nullOption);
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

            let value = values[this.state.input.options.key];

            //check if is multiple and get value in not in current values
            if (this.multiple) {
              //set new value. If value is already selected, get current value of state.value
              value = undefined === this.getMultiValues().find(v => value == v) ? `{${[...this.getMultiValues(), value].join()}}` : this.state.value;
            }

            // Check if the value is change (Use comparison operator, NOT STRICT, because value and this.state.value can be different type Number, String)
            if (value != this.state.value) {
              if (this.autocomplete) {
                //in the case of no multipe values, need to reset values
                if (!this.multiple) { this.state.input.options.values.splice(0) }
                this.state.input.options.values.push({
                  key:    values[this.state.input.options.value]    ,
                  value:  values[this.state.input.options.key]
                });
              }
              //need to sort values
              this.service.sortValues();
                //set new value to this.state.value
              await this.changeSelect(value);
              //trigger change value on select2
              this.select2.val(this.multiple ? this.getMultiValues() : value).trigger('change');
            }

            //show a success message
            GUI.showUserMessage({ type: 'success', autoclose: true });

            this.picked = false;
          }
        } catch(e) {
          console.warn(e);
          GUI.showUserMessage({
            type:      "warning",
            message:   'sdk.form.inputs.messages.errors.picklayer',
            autoclose: true
          });
          this.picked = false;
        }
      },
      /**
       * @since 3.11.0
       * return <Array> values
       */
      getMultiValues() {
        return [undefined, null, ''].includes(this.state.value)
          ? [] //return empty array values
          : Array.from(
            new Set(
              `${this.state.value}`
                .replace(/^{|}$/g, '')  // Remove both open and close curly braces
                .replace(/"/g, "") //remove ""
                .split(','))
          ).filter(v => this.autocomplete || (this.state.input.options.values.map(({ value }) => `${value}`).includes(`${v}`)));
      },
      /**
       * Method to handle select2 event
       */
      setAndListenSelect2Change() {
        //Listen unselect/remove value
        this.select2.on('select2:unselect', (e) => {
          const value = e.params.data.$value
            ? e.params.data.$value
            : e.params.data.id;
          if (this.multiple) {
            //get array of values
            const values = this.getMultiValues().filter(v => v != value);
            //filter already added value, for example, by picked
            if (this.autocomplete) {
              this.state.input.options.values = this.state.input.options.values.filter(v => value != v.value);
            }
            this.changeSelect(0 === values.length ? null : `{${values.join()}}`);
          }

          if (this.showNullOption && !this.multiple) {
            this.changeSelect(null);
          }

        })

        this.select2.on('select2:select', e => {
          //get value from select2 option
          let value = e.params.data.$value
            ? e.params.data.$value
            : e.params.data.id;

          value = this.showNullOption
            ? value === G3W_SELECT2_NULL_VALUE

              ? null
              : value.toString()

            : value.toString();
          // in case of multiple select values, need to set value as {"value1", "value2",...}
          if (this.multiple) {
            value = (
              this.getMultiValues().length > 0
            ) ? `{${[...this.getMultiValues(), value].join()}}`
              : `{${value}}`
          }

          this.changeSelect(value);

        });
      }
    },

    watch: {
      /**
       *
       * @param {Array} values Array of key value objects
       * @return {Promise<void>}
       */
      async 'state.input.options.values'(values = []) {
        await this.$nextTick();
        if (this.autocomplete) {
          return;
        }
        let value;
        //check if is an empty array values
        const is_empty = 0 === values.length;
        //if values is empty array or current state.value {val1, val2} has not value of current values
        if (is_empty || (this.multiple && 0 === this.getMultiValues().length)) {
          //set null
          value = G3W_SELECT2_NULL_VALUE;
        }
        //in the case of multiple selection, need to set array values as select2
        if (!is_empty && this.multiple && this.getMultiValues().length > 0) {
          //get current value
          value = `{${this.getMultiValues().join()}}`;
        }
        //no empty values and not multiple select values
        if (!is_empty && !this.multiple) {
          value = (values.find(({ value }) => value == this.state.value) || { value:  G3W_SELECT2_NULL_VALUE }).value;
        }

        //check if changed value
        const changed    = value != this.state.value;

        //set value
        this.state.value = value;

        this.select2.val(this.multiple ? this.getMultiValues() : this.state.value).trigger('change');

        if (changed) {
          this.change();
        }
      }
    },

    async created() {

      //unwatch attributes
      this.unwatch;
      this.filterFieldsUnwatches;

      const {
        relation_id,
        filter_fields =      [],
        relation_reference = false,
        chain_filters =      false, /** @type Boolean if true filter_fields select are related ech other*/
        allowmulti =         false, //@since v3.11.0 multi select value
      } = this.state.input.options;
      //set multiple values
      this.multiple = allowmulti;
        //In case of relation reference check if filter_fields is set
      if (relation_reference && Array.isArray(filter_fields) && filter_fields.length > 0) {
        //set loading true
        this.setLoading(true);
        /** {Boolean} @type it used to show component when all data are ready*/
        this.isFilterFieldsReady        = false;
        //data from relation
        const {
          referencedLayer,
          referencingLayer,
          fieldRef : { referencingField, referencedField }
        }                               = ApplicationState.project.getRelationById(relation_id);
        //current layer in editing
        const layer                     = getCatalogLayerById(referencingLayer)
        //relation layer
        const relationLayer             = getCatalogLayerById(referencedLayer);
        //fields of relation layer
        const relationLayerFields       = relationLayer.getFields();
        //check if it has a value
        if (null !== this.state.value) {
          try {
            //get a single feature used to set values of filter_fields
            const { data = [] } = await relationLayer.getFilterData({
              formatter : 0,
              field : createSingleFieldParameter({
                field : referencedField[0], // field related to relation (in case of relation_reference it is just one field)
                value : this.state.value // current input value. Is value related to field of relation layer
              })
            })
            //get all data referencing to al filter_fields values in fformatter
            // ad set values for input
            this.state.input.options.values = (
              (await layer.getFilterData({
                fformatter: referencingField[0],
                order:      referencingField[0],
                ffield:     filter_fields //create a filet with filter fields values (ex. field1|eq|1|AND,field2|eq|test)
                  .map((f, i) => {
                    const value = undefined === data[0].features[0].get(f) ? `${G3W_SELECT2_NULL_VALUE}` : data[0].features[0].get(f);
                    //get the value of filter_field from feature response
                    //and set as value. Used after to set initial value of filter field of select
                    this.filterFields.push({
                      id:     f, //field name
                      values: [
                        {
                          key: `[${relationLayerFields.find(_f => _f.name === f).label}]`,
                          value:`${G3W_SELECT2_NULL_VALUE}` //null
                        }
                      ], //values
                      value,
                      disabled: chain_filters
                        && i > 0
                        && `${G3W_SELECT2_NULL_VALUE}` === this.filterFields[filter_fields[i-1]],
                    })
                    return createSingleFieldParameter({
                      field: f,
                      value
                    })
                  }).join('|AND,')
                })).data || []).map(([value, key]) => ({key, value}));

            //in the case of chain_filters
            if (chain_filters) {
              //first filter field need to get all value avery time
              (await relationLayer.getFilterData({
                unique:    filter_fields[0],
                ordering:  filter_fields[0],
                formatter: 0,
              })).forEach(v => this.filterFields[0].values.push({ key: v, value: v }));

              (await Promise.allSettled(
                filter_fields
                  .slice(1)
                  .map((f,i) => {
                    return relationLayer.getFilterData({
                      unique:    filter_fields[i+1],
                      ordering:  filter_fields[i+1],
                      formatter: 0,
                      field: this.filterFields.slice(0, i+1)
                        .filter(f => 'null' !== f.value)
                        .map(f => createSingleFieldParameter({
                          field: f.id,
                          value: f.value
                        })).join('|AND,')
                    })
                  })
              ))
              .forEach(({ status, value: data }, i) => {
                if ('fulfilled' === status) {
                  data.forEach(v => this.filterFields[i+1].values.push({ key: v, value: v }));
                }
              })
            } else {
              //No chain filters
              (await Promise.allSettled(
                filter_fields.map(f => relationLayer.getFilterData({ unique: f, ordering: f, formatter: 0 }))
              ))
              .forEach(({ status, value: data }, index) => {
                if ('fulfilled' === status) {
                  //set values for all filer fields
                  data.forEach(v => this.filterFields[index].values.push({ key: v, value: v }));
                }
              });
            }
          } catch(e) {
            console.warn(e);
          }
        }
        else {
          //sett all values for all filter fields
          (await Promise.allSettled(
            filter_fields
              .map((f, i) => {
                this.filterFields.push({
                  id:     f, //field name
                  values: [
                    {
                      key: `[${relationLayerFields.find(_f => _f.name === f).label}]`,
                      value:`${G3W_SELECT2_NULL_VALUE}` //null
                    }
                  ], //values
                  value:    `${G3W_SELECT2_NULL_VALUE}`, //current value
                  disabled: chain_filters && i > 0,
                })
                return relationLayer.getFilterData({
                  unique :    f,
                  formatter : 0,
                  ordering :  f
                });
              })
          ))
          .forEach(({ status, value:data }, i) => {
            if ('fulfilled' === status) {
              data.forEach(v => this.filterFields[i].values.push({ key: v, value: v }))
            }
          });
        }

        //watch change of value
        this.filterFieldsUnwatches = this.filterFields.map((f, index) => {
          return this.$watch(
            () => f.value, // listen to change of value
            async (value) => {
              //set loading true
              this.setLoading(true);
              // in the case of chain_filters
              if (chain_filters) {
                //need to be disabled fields in a chain after current index
                for (let i = index + 1; i < this.filterFields.length; i++) {
                  this.filterFields[i].value    = `${G3W_SELECT2_NULL_VALUE}`;
                  this.filterFields[i].values   = [this.filterFields[i].values[0]];
                  this.filterFields[i].disabled = `${G3W_SELECT2_NULL_VALUE}` === value;
                }
                try {
                  const filter = this.filterFields
                    .slice(0, index + 1)
                    .filter((f) => `${G3W_SELECT2_NULL_VALUE}` !== f.value)
                    .map((f) => createSingleFieldParameter({
                      field: f.id,
                      value: f.value
                    })).join('|AND,');

                  const { data: rdata = [] } = await relationLayer.getFilterData({ field: filter });

                  if (rdata[0] && rdata[0].features) {
                    const filterReferencedFieldValues = [];
                    rdata[0].features.forEach((f => {
                      filterReferencedFieldValues.push(f.get(referencedField));
                      if (index < this.filterFields.length - 1) {
                        const value = f.get(this.filterFields[index + 1].id)
                        this.filterFields[index + 1].values.push({ key: value, value });
                      }
                    }))
                  }
                } catch (e) {
                  console.warn(e);
                }
              }
              this.state.input.options.values = (
                (await layer.getFilterData({
                  fformatter : referencingField[0],
                  ordering :   referencingField[0],
                  ffield :     this.filterFields
                                 .filter((f) => `${G3W_SELECT2_NULL_VALUE}` !== f.value)
                                 .map((f) => createSingleFieldParameter({ field: f.id, value: f.value }))
                                 .join('|AND,')
                })).data || []).map(([value, key]) => ({ key, value }));
              //in the case of values length
              if (this.state.input.options.values.length > 0) {
                this.state.value = this.state.input.options.values[0].value;
                this.select2.val(this.state.value).trigger('change');
                await this.changeSelect(this.state.value);
              }
              //stop loading
              this.setLoading(false);
            })
        })

        //stop loading
        this.setLoading(false);
        //filter fields are ready
        this.isFilterFieldsReady = true;
      }

      if ('select_autocomplete' === this.state.input.type) {
        //get dependency layer id if set
        const dependencyLayerId = this.state.input.options.layer_id;
        if (dependencyLayerId) {
          try {
            const dependencyLayer = GUI.getService('map')
              .getProjectLayer(dependencyLayerId)
              .getEditingLayer() || getCatalogLayerById(dependencyLayerId);
            // in case layer is on project, check if is non an alphanumeric layer
            this.showPickLayer = dependencyLayer && Layer.LayerTypes.TABLE !== dependencyLayer.getType();
            if (this.showPickLayer) {
              const {
                key,
                value,
                layer_id
              } = this.state.input.options;

              //create pick layer service
              this.pickLayerInputService = new PickLayerInputService({
                layer_id,
                fields :    [value, key], //fields are key, and values
                //need to check if dependency layer is on editing,
                // so we can pick vector map layer, otherwise wms request is done
                pick_type : dependencyLayer.isStarted && dependencyLayer.isStarted() ? 'map' : null
              });
            }

          } catch(e) { console.warn(e); }
        }

      }
    },

    async mounted() {
      await this.$nextTick();

      const selectElement  = $(this.$refs.select);
      const language       =  this.getLanguage();
      const dropdownParent = undefined === this.state.dropdownParent && $('#g3w-view-content');
      if (this.autocomplete) {
        this.select2 = selectElement.select2({
          minimumInputLength: 1,
          dropdownParent,
          multiple:           this.multiple, //@since v3.11.0
          allowClear:         this.showNullOption,
          placeholder:        '', // need to set placeholder in case of allowClear, otherwise doesn't work
          language,
          ajax: {
            delay: 250,
            transport: (params, success, failure) => {
              const search = params.data.term;
              // hide a previous result if present
              $('.select2-results__option.loading-results').siblings().hide();
              this.service.getData({
                key:   this.state.input.options.value,
                value: this.state.input.options.key,
                search
              })
                .then(values => success(values))
                .catch(e => { console.warn(e); failure(e); })
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
        //check if input has a value
        if (this.state.value) {
          //need to reset values otherwise can be repeated;
          this.state.input.options.values.splice(0);
          await this.service.getKeyByValue({
            search: this.multiple ? this.getMultiValues(): this.state.value
          });
        }
      } else {
        this.select2 = selectElement.select2({
          language,
          dropdownParent,
          multiple:                this.multiple, //@since v3.11.0
          minimumResultsForSearch: this.isMobile() ? - 1 : null
        });
      }
      this.setAndListenSelect2Change();
      //in the case of multiple selection, need to set array values as select2
      if (this.multiple && this.getMultiValues().length > 0) {
        this.select2.val(this.getMultiValues()).trigger('change');
      } else {
        this.setValue();
      }

    },
    beforeDestroy() {
      if (this.pickLayerInputService) {
        this.pickLayerInputService.clear();
        this.pickLayerInputService = null;
      }
      if (this.unwatch) {
        this.unwatch();
        this.unwatch = null;
      }
      //in the case of filter fields need to remove all watch handlers
      if (this.filterFieldsUnwatches) {
        this.filterFieldsUnwatches.forEach(uw => uw());
        this.filterFieldsUnwatches = null;
      }
    }
  };
</script>

<style scoped>
  .g3w-input-pick-layer {
    cursor: pointer;
    position:relative;
    top: 2px;
    font-size: 1.2em;
  }
</style>