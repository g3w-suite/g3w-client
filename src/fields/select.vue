<!--
  @file
  
  ORIGINAL SOURCE: src/components/InputSelect.vue@3.8

  @since 3.9.0
-->

<template>
  <!--
      @example <g3w-field mode="input" _type="select" />
  -->
  <g3w-field :state="state">

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
        <!-- ORIGINAL PROPOSE BY: https://github.com/g3w-suite/g3w-client/pull/450 -->
        <!-- <select
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
        </select> -->

        <!-- @TODO check what's changed from above..  -->
        <!-- ADDED BY: https://github.com/g3w-suite/g3w-client/pull/534 -->
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
    </template>

    <!-- ERROR TEXT -->
    <template #input-message>
      <p
        v-if  = "'error' === $parent.loadingState"
        class = "error-input-message"
        v-t   = "'server_error'"
      ></p>
    </template>

  </g3w-field>
</template>

<script>
import CatalogLayersStoresRegistry     from 'store/catalog-layers';
import MapLayersStoresRegistry         from 'store/map-layers';
import ProjectsRegistry                from 'store/projects';
import GUI                             from 'services/gui';
import G3WField                        from 'components/G3WField.vue';
import { selectMixin, select2Mixin }   from 'mixins';
import { createSingleFieldParameter }  from 'utils/createSingleFieldParameter';

const Layer = require('core/layers/layer');

Object
    .entries({
      CatalogLayersStoresRegistry,
      MapLayersStoresRegistry,
      GUI,
      G3WField,
      selectMixin,
      select2Mixin,
    })
    .forEach(([k, v]) => console.assert(undefined !== v, `${k} is undefined`));

const G3W_SELECT2_NULL_VALUE = null; // need to set nul value instead of empty string

export default {

  /** @since 3.8.6 */
  // name: 'input-select',

  components: {
    'g3w-field': G3WField,
  },

  mixins: [
    selectMixin,
    select2Mixin
  ],

  data() {
    return {
      showPickLayer:       false,
      picked:              false,
      filterFields:        [],    // each item
      isFilterFieldsReady: false  // whether to show selected filter_fields when ready
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

    /**
     * @param { Array } values Array of key value objects
     * 
     * @return { Promise<void> }
     */
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

  /** ORIGINAL PROPOSE BY: https://github.com/g3w-suite/g3w-client/pull/450 */
  // created() {

  //   this.open = false;

  //   if ('select_autocomplete' === this.state.input.type) {
  //     const { value, layer_id } = this.state.input.options;
  //     const layer = ( 
  //       MapLayersStoresRegistry.getLayerById(layer_id).getEditingLayer() ||
  //       CatalogLayersStoresRegistry.getLayerById(layer_id)
  //     );
  //     this.showPickLayer = layer
  //       ? layer.getType() !== Layer.LayerTypes.TABLE
  //       : false;
  //     this.pickLayerInputService = this.showPickLayer && this.$parent.createInputService('picklayer', {
  //       layer_id,
  //       fields: [value],
  //       pick_type: (layer.isStarted && layer.isStarted() && 'map' || null)
  //     });
  //   }

  //   // ORIGINAL SOURCE: src/app/gui/inputs/select/service.js@3.8::getKeyByValue()
  //   if (this.autocomplete && this.state.value) {
  //     const service = this.$parent.getInputService();
  //     const options = service.getState().input.options;

  //     this
  //       ._getData({
  //           key:    options.value,
  //           value:  options.key,
  //           search: service.getValue()
  //       })
  //       .then(d => {
  //         options.values.push({ key: d[0].$value, value: d[0].text }); // add value
  //       })
  //       .catch(console.warn);
  //   }

  // },

  /** @TODO make it simpler / check what's changed from above.. */
  /** ADDED BY: https://github.com/g3w-suite/g3w-client/pull/534 */
  async created() {
    //unwatch attributes
    this.unwatch;
    this.filterFieldsUnwatches;

    const {
      filter_fields=[],
      relation_reference,
      relation_id,
      chain_filters=false, /** @type Boolean if true filter_fields select are related ech other*/
    } = this.state.input.options;
    //In case of relation reference check if filter_fields is set
    if (relation_reference && Array.isArray(filter_fields) && filter_fields.length > 0) {
      //set loading true
      this.$parent.setLoading(true);
			/** {Boolean} @type it used to show component when all data are ready*/
      this.isFilterFieldsReady        = false;
      //data from relation
      const {
        referencedLayer,
        referencingLayer,
        fieldRef:{
          referencingField,
          referencedField
        }
      }                               = ProjectsRegistry.getCurrentProject().getRelationById(relation_id);
      //current layer in editing
      const layer                     = CatalogLayersStoresRegistry.getLayerById(referencingLayer)
      //relation layer
      const relationLayer             = CatalogLayersStoresRegistry.getLayerById(referencedLayer);
      //fields of relation layer
      const relationLayerFields       = relationLayer.getFields();
      //check if it has a value
      if (null !== this.state.value) {
        try {
          //get single feature used to set values of filter_fields
          const {data=[]} = await relationLayer.getFilterData({
            formatter: 0,
            field: createSingleFieldParameter({
              field: referencedField[0], // field related to relation (in case of relation_reference it is just one field)
              value: this.state.value //current input value. Is value related to field of relation layer
            })
          })
		      //get all data referencing to al filter_fields values in fformatter
          // ad set values for input
          this.state.input.options.values = (
            (await layer.getFilterData({
		        fformatter: referencingField[0],
		        order: referencingField[0],
            //create a filet with filter fields values (ex. field1|eq|1|AND,field2|eq|test)
            ffield: filter_fields
              .map((f, i) => {
                const value = undefined === data[0].features[0].get(f)
                  ? `${G3W_SELECT2_NULL_VALUE}`
                  : data[0].features[0].get(f);
                //get value of filter_field from feature response
                //and set as value. Used after to set initial value of filter field of select
                this.filterFields.push({
                  id: f, //field name
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

					//in case of chain_filters
          if (chain_filters) {
            //first filter field need to get all value avery time
            (await relationLayer.getFilterData({
	            unique: filter_fields[0],
		          ordering: filter_fields[0],
	            formatter: 0,
            })).forEach(v => this.filterFields[0].values.push({key:v, value:v}));

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
            )).forEach(({status, value:data}, i) => {
              if ('fulfilled' === status) {
                data.forEach(v => this.filterFields[i+1].values.push({key:v, value: v}));
              }
            })
          } else {
            //No chain filters
            (await Promise.allSettled(
              filter_fields.map(f => relationLayer.getFilterData({unique: f, ordering: f, formatter: 0}))
            )).forEach(({status, value:data}, index) => {
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
        )).forEach(({status, value:data}, i) => {
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
                this.filterFields[i].value = `${G3W_SELECT2_NULL_VALUE}`;
                this.filterFields[i].values = [this.filterFields[i].values[0]];
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
            this.state.input.options.values = (
              (await layer.getFilterData({
                fformatter: referencingField[0],
		            ordering: referencingField[0],
                ffield:  this.filterFields
                  .filter((f) => `${G3W_SELECT2_NULL_VALUE}` !== f.value)
                  .map((f) => createSingleFieldParameter({
                    field: f.id,
                    value: f.value
                  })).join('|AND,')
              })).data ||[]
            ).map(([value, key]) => ({key, value}));
            //in case of values length
            if (this.state.input.options.values.length > 0) {
              this.state.value = this.state.input.options.values[0].value;
              this.select2.val(this.state.value).trigger('change');
              this.changeSelect(this.state.value);
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

        this.pickLayerInputService = this.showPickLayer && this.$parent.createInputService('picklayer', options);
      } catch(err) {
        console.warn(err);
      }
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
      this.unwatch = null;
    }

    // in case of filter fields need to remove all watch handler
    if (this.filterFieldsUnwatches) {
      this.filterFieldsUnwatches.forEach(uw => uw());
      this.filterFieldsUnwatches = null;
    }
    
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