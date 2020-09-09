<template>
  <select :name="forminput.attribute" class="form-control" :id="forminput.id" :disabled="forminput.options.disabled">
    <option :value="value" v-for="value in forminput.options.values" :key="value">
      <span v-if="value === allvalue " v-t="'sdk.search.all'"></span>
      <span v-else>{{ value }}</span>
    </option>
  </select>
</template>

<script>
  const autocompleteOptions = require('gui/external/select2/options/autocomplete');
  const { t } = require('core/i18n/i18n.service');
  const { debounce } = require('core/utils/utils');
  import { ALLVALUE }  from '../../constants';
  export default {
    name: "select2",
    props: ['forminput','autocompleteRequest'],
    methods: {
      _initSelect2Element() {
        const { type, attribute } = this.forminput;
        const isAutocomplete = type === 'autocompletefield';
        this.select2 = $(this.$el).select2({
          width: '100%',
          minimumInputLength: isAutocomplete && 3 || 0,
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
    },
    beforeDestroy() {
      this.select2.select2('destroy');
      this.select2 = null;
    }
  }
</script>

<style scoped>

</style>
