<template>
  <div class="form-group" style="width: 100%;">
    <label :for="print_atlas_autocomplete" style="display: block">
      <span>{{ atlas.field_name || 'fid' }}</span>
    </label>
    <select :name="atlas.field_name" class="form-control"  id="print_atlas_autocomplete">
    </select>
  </div>
</template>

<script>
  const { t } = require('core/i18n/i18n.service');
  const {autocompleteMixin} = require('gui/vue/vue.mixins');
  let select2;
  export default {
    name: "selectAtlasFieldValues",
    mixins: [autocompleteMixin],
    props: {
      atlas: {
        type: Object,
        required: true
      }
    },
    methods: {
      async emitValues(){
        await this.$nextTick();
        setTimeout(()=>{
          this.$emit('set-values', this.values)
        })
      }
    },
    async mounted(){
      this.values = [];
      await this.$nextTick();
      let {field_name:field, qgs_layer_id:layerId} = this.atlas;
      field = field || 'fid';
      select2 = $('#print_atlas_autocomplete').select2({
        width: '100%',
        multiple: true,
        minimumInputLength: 1,
        ajax: {
          delay: 500,
          transport: async ({data:{q:value}}, success, failure) => {
            try {
              const data = await this.autocompleteRequest({
                layerId,
                field,
                value
              });
              success({results: data});
            } catch(error){
              failure(error);
            }
          }
        },
        matcher: (params, data) => {
          const searchItem = params.term ? params.term.toLowerCase(): params.term;
          // If there are no search terms, return all of the data
          if ($.trim(searchItem) === '') return data;
          // Do not display the item if there is no 'text' property
          if (typeof data.text === 'undefined') return null;
          // `params.term` should be the term that is used for searching
          // `data.text` is the text that is displayed for the data object
          if (data.text.toLowerCase().indexOf(searchItem) > -1) {
            const modifiedData = $.extend({}, data, true);
            // You can return modified objects from here
            // This includes matching the `children` how you want in nested data sets
            return modifiedData;
          }
          // Return `null` if the term should not be displayed
          return null;
        },
        "language": {
          noResults(){
            return t("sdk.search.no_results");
          },
          errorLoading(){
            return t("sdk.search.error_loading")
          },
          searching(){
            return t("sdk.search.searching")
          },
          inputTooShort(args) {
            const remainingChars = args.minimum - args.input.length;
            return `${t("sdk.search.autocomplete.inputshort.pre")} ${remainingChars} ${t("sdk.search.autocomplete.inputshort.post")}`;
          }
        },
      });
      select2.on('select2:select', evt => {
        const value = evt.params.data.id;
        this.values.push(value);
        this.emitValues();
      });
      select2.on('select2:unselect', async evt =>{
        const value =  evt.params.data.id;
        this.values = this.values.filter(currentValue => currentValue !== value);
        this.emitValues();
      })
    },
    beforeDestroy() {
      this.values = null;
      select2.select2('destroy');
      select2 = null;
    }
  }
</script>

<style scoped>
</style>