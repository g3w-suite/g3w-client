<!--
  @file
  @since v3.7
-->

<template>
  <div class="form-group" style="width: 100%;">
    <label :for="print_atlas_autocomplete" style="display: block">
      <span>{{ atlas.field_name}}</span>
    </label>
    <select :name="atlas.field_name" class="form-control"  id="print_atlas_autocomplete">
    </select>
  </div>
</template>

<script>
  import { autocompleteMixin, select2Mixin } from 'mixins';

  const autocompleteOptions = require('gui/external/select2/options/autocomplete');

  export default {
    name: "selectAtlasFieldValues",
    mixins: [autocompleteMixin, select2Mixin],
    props: {
      atlas: {
        type: Object,
        required: true
      },
      reset: {
        type: Boolean,
        default: false
      }
    },
    methods: {
      async emitValues(){
        await this.$nextTick();
        this.$emit('set-values', this.values)
      }
    },
    data(){
      return {
        values: []
      }
    },
    watch: {
      values: {
        immediate: true,
        handler(values){
          this.$emit('disable-print-button', values.length === 0);
        }
      },
      reset(bool) {
       if (bool){
         this.select2 && this.select2.val(null).trigger('change');
         this.values = [];
         this.emitValues();
       }
      }
    },
    async mounted(){
      await this.$nextTick();
      let {field_name:field, qgs_layer_id:layerId} = this.atlas;
      this.select2 = $('#print_atlas_autocomplete').select2({
        width: '100%',
        multiple: true,
        dropdownParent: $(this.$el),
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
        ...autocompleteOptions
      });
      this.select2.on('select2:select', evt => {
        const value = evt.params.data.id;
        this.values.push(value);
        this.emitValues();
      });
      this.select2.on('select2:unselect', async evt => {
        const value =  evt.params.data.id; // it seems always string
        // need to check != instead of !== because we need to compare sometime number with string
        this.values = this.values.filter(currentValue => currentValue != value);
        this.emitValues();
      });
    },
    beforeDestroy() {
      this.values = null;
      this.$emit('disable-print-button', false);
    }
  }
</script>

<style scoped>
</style>