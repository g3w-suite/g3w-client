<template>
  <div id="g3w-fields-to-downloads">
    <h4 style="font-weight: bold">Seleziona campi</h4>
    <section class="g3w-fields-to-downloads-inputs">
      <input
        @click.stop = "selectAll"
        :id         = "`select_all_fields_to_download`"
        type        = "checkbox"
        class       = "magic-checkbox"
        :checked    = "all"
      >
      <label
        :for  = "`select_all_fields_to_download`"
        style = "color: #FFF"> All
      </label>
      <divider/>
      <div v-for="field in fields" :key="field.name">
        <input
          @click.stop = "selectField(field)"
          :id         = "`${field.name}_${index}_select_field_to_download`"
          type        = "checkbox"
          class       = "magic-checkbox"
          :checked    = "field.selected"
        >
        <label
          :for  = "`${field.name}_${index}_select_field_to_download`"
          style = "color: #FFF"> {{ field.label }}
        </label>
      </div>
    </section>
  </div>

</template>

<script>
export default {
  name: 'downloadfieldslayer',
  props: {
    fields: {
      type: Array,
      default: [],
      required: true
    }
  },
  data() {
    return {
      all: true
    }
  },
  methods: {
    selectField(field) {
      field.selected = !field.selected;
      if (field.selected) {
        this.all = undefined === this.fields.find(field => !field.selected);
        this.$emit('selected-fields', true);
      } else {
        this.all = false;
        this.$emit('selected-fields', undefined !== this.fields.find(field => field.selected));
      }
    },
    selectAll() {
      this.all = !this.all;

      this
        .fields
        .forEach(field => field.selected = this.all)

      this.$emit('selected-fields', this.all);
    }
  },
};
</script>
<style scoped>
  #g3w-fields-to-downloads label{
    color: #000000 !important;
  }
</style>
