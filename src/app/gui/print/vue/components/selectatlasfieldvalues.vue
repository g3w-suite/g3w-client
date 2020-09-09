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
  const autocompleteOptions = require('gui/external/select2/options/autocomplete');
  const {autocompleteMixin} = require('gui/vue/vue.mixins');
  let select2;
  export default {
    name: "selectAtlasFieldValues",
    mixins: [autocompleteMixin],
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
    watch: {
      reset(bool) {
       if (!bool){
         select2 && select2.val(null).trigger('change');
         this.values = [];
         this.emitValues();
       }
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
        ...autocompleteOptions
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