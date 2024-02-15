<!--
  @file
  @since v3.7
-->

<template>
  <select :name="forminput.attribute" class="form-control" :id="forminput.id" v-disabled="forminput.options.disabled || forminput.loading">
    <option :value="keyvalue.value" v-for="keyvalue in forminput.options.values" :key="keyvalue.value">
      <span v-if="keyvalue.value === allvalue " v-t="'sdk.search.all'"></span>
      <span v-else>{{ keyvalue.key }}</span>
    </option>
  </select>
</template>

<script>
  import { SEARCH_ALLVALUE as ALLVALUE } from 'app/constant';
  import { select2Mixin } from 'mixins';

  const autocompleteOptions = require('gui/external/select2/options/autocomplete');
  const { t } = require('core/i18n/i18n.service');
  const { debounce } = require('utils');

  export default {
    name: "select2",
    props: ['forminput','autocompleteRequest'],
    mixins: [select2Mixin],
    methods: {
      emitChangeEvent(evt){
        const id = $(evt.target).attr('id');
        const attribute = $(evt.target).attr('name');
        const data = evt.params.data;
        const value =  data ?  data.id : ALLVALUE;
        this.$emit('select-change', {
          id,
          attribute,
          value,
          type: this.forminput.type
        });
      },
      _initSelect2Element() {
        const { type, attribute, options } = this.forminput;
        // get numdigaut and validate it
        const numdigaut = options.numdigaut && !Number.isNaN(1*options.numdigaut) && 1*options.numdigaut > 0 && 1*options.numdigaut || 2;
        const isAutocomplete = type === 'autocompletefield';
        this.select2 = $(this.$el).select2({
          width: '100%',
          dropdownParent:$('.g3w-search-form:visible'),
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
        this.select2.on('select2:select', evt => {
          this.emitChangeEvent(evt);
        });
        this.forminput.type === 'autocompletefield' && this.select2.on('select2:unselecting', evt => {
          this.emitChangeEvent(evt);
        });
      }
    },
    watch : {
      async 'forminput.value'(value) {
        await this.$nextTick();
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