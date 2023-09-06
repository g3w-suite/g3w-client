<!-- ORIGINAL SORUCE: -->
<!-- gui/fields/text.vue@v3.4 -->

<template>
  <g3w-field :state="state"></g3w-field>
</template>

<script>
export default {

  /** @since 3.8.6 */
  name: "field-text",

  props: ['state'],

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
