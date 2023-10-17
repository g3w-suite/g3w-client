<template>
  <section id="g3w-fields-to-downloads">
      <input
        @click.stop = "selectAll"
        :id         = "`select_all_fields_to_download`"
        type        = "checkbox"
        class       = "magic-checkbox"
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
      >
      <label
        :for  = "`${field.name}_${index}_select_field_to_download`"
        style = "color: #FFF"> {{ field.label }}
      </label>
    </div>
  </section>
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
    },
    selectAll() {
      this.all = !this.all;
    }
  },
  watch: {
    all(bool) {
      this
        .fields
        .forEach(field => field.selected = bool)
    }
  }
};
</script>
<style scoped>
  #g3w-fields-to-downloads label{
    color: #000000 !important;
  }
</style>
