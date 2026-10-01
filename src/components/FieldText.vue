<!-- ORIGINAL SORUCE: -->
<!-- gui/fields/text.vue@v3.4 -->

<template>
  <div class = "field g3w-field">
    <div v-if = "state.showlabel" class = "field_label">{{ state.label }}</div>
    <div class = "field_value">
      <span style = "word-wrap: break-word;" v-html = "state.value"></span>
    </div>
  </div>
</template>

<script>
export default {

  /** @since 3.8.6 */
  name: "field-text",

  props: {
    state: { 
      required: true, 
      type:     Object 
    }
  },

};
</script>

<style scoped>
  .field_text_table {
    background-color: transparent !important;
  }
  .field_text_table .field_label {
    font-weight: bold;
  }
</style>
