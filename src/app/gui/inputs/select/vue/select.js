const PickLayerInputService = require('gui/inputs/picklayer/service');
const MapLayersStoreRegistry = require('core/map/maplayersstoresregistry');
const CatalogLayersStoresRegistry = require('core/catalog/cataloglayersstoresregistry');
const Layer = require('core/layers/layer');
const Input = require('gui/inputs/input');
const selectMixin = require('./selectmixin');
const {select2Mixin} = require('gui/vue/vue.mixins');
const GUI = require('gui/gui');

const SelectInput = Vue.extend({
  mixins: [Input, selectMixin, select2Mixin],
  data() {
    return {
      showPickLayer: false
    }
  },
  template: require('./select.html'),
  computed:{
    showNullOption(){
      return this.state.nullOption === undefined || this.state.nullOption === true;
    },
    disabled(){
      return !this.editable || this.loadingState === 'loading' || this.loadingState === 'error';
    }
  },
  watch: {
    'state.input.options.values'(values) {
     if (!this.autocomplete && !this.state.value && values.length)
       this.changeSelect(values[0].value);
    }
  },
  methods: {
    async pickLayerValue(){
      try {
        const values = await this.pickLayerInputService.pick();
        const {value:field}= this.state.input.options;
        const value = values[field];
        this.select2.val(value).trigger('change');
        this.changeSelect(value);
        GUI.showUserMessage({
          type: 'success',
          autoclose: true
        })
      } catch(err){
        GUI.showUserMessage({
          type: "warning",
          message: 'sdk.form.inputs.messages.errors.picklayer',
          autoclose: true
        })
      }
    }
  },
  created() {
    this.open = false;
    if (this.state.input.type === 'select_autocomplete') {
      const dependencyLayerId = this.state.input.options.layer_id;
      try {
        const dependencyLayer =  MapLayersStoreRegistry.getLayerById(dependencyLayerId).getEditingLayer() || CatalogLayersStoresRegistry.getLayerById(dependencyLayerId);
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
    const selectElement = $(this.$refs.select);
    const language =  this.getLanguage();
    const dropdownParent = this.state.dropdownParent === undefined && $('#g3w-view-content');
    if (this.autocomplete) {
      this.select2 = selectElement.select2({
        minimumInputLength: 1,
        dropdownParent,
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
    ///register events
    this.state.value && this.select2.val(this.state.value).trigger('change');
    this.select2.on('select2:select', event => {
      const value = event.params.data.$value ? event.params.data.$value : event.params.data.id;
      this.changeSelect(value);
    });
  },
  beforeDestroy() {
    if (this.pickLayerInputService){
      this.pickLayerInputService.clear();
      this.pickLayerInputService = null;
    }
  }
});

module.exports = SelectInput;
