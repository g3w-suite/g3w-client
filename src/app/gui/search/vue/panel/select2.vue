<template>
  <select :name="forminput.attribute" class="form-control" :id="forminput.id" :disabled="forminput.options.disabled">
    <option :value="keyvalue.value" v-for="keyvalue in forminput.options.values" :key="keyvalue.value">
      <span v-if="keyvalue.value === allvalue " v-t="'sdk.search.all'"></span>
      <span v-else>{{ keyvalue.key }}</span>
    </option>
  </select>
</template>

<script>
  import { ALLVALUE }  from '../../constants';
  const autocompleteOptions = require('gui/external/select2/options/autocomplete');
  const { t } = require('core/i18n/i18n.service');
  const { debounce } = require('core/utils/utils');
  const {select2Mixin} = require('gui/vue/vue.mixins');
  export default {
    name: "select2",
    props: ['forminput','autocompleteRequest'],
    mixins: [select2Mixin],
    methods: {
      _initSelect2Element() {
        const { type, attribute, options } = this.forminput;
        // get numgigaut and validate it
        const numdigaut = options.numdigaut && !Number.isNaN(1*options.numdigaut) && 1*options.numdigaut > 0 && 1*options.numdigaut || 2;
        const isAutocomplete = type === 'autocompletefield';
        this.select2 = $(this.$el).select2({
          width: '100%',
          dropdownParent:$('#g3w-search-form'),
          minimumInputLength: isAutocomplete && numdigaut || 0,
          allowClear: isAutocomplete,
          placeholder : isAutocomplete ? '' : null,
          ajax: isAutocomplete ? {
            delay: 500,
            transport: async ({data:{q:value}}, success, failure) => {
              try {
                const data = await this.autocompleteRequest({
                  field: attribute,
                  value
                });
                success({results: data});
              } catch(error){
                failure(error);
              }
            }
          } : null,
         ...autocompleteOptions
        });
        this.select2.on('select2:select', (evt) => {
          const id = $(evt.target).attr('id');
          const attribute = $(evt.target).attr('name');
          const value = evt.params.data.id;
          this.$emit('select-change', {
            id,
            attribute,
            value,
            type: this.forminput.type
          });
        });
        this.forminput.type === 'autocompletefield' && this.select2.on('select2:unselecting', ()=>{
          this.forminput.value = null;
        })
      }
    },
    watch : {
      'forminput.value'(value) {
        if (value === ALLVALUE) {
          this.select2.val(value);
          this.select2.trigger('change');
        }
      }
    },
    created(){
      this.allvalue = ALLVALUE;
    },
    async mounted() {
      await this.$nextTick();
      this._initSelect2Element();
    }
  }
</script>

<style scoped>

</style>
