<!-- ORIGINAL SORUCE: -->
<!-- gui/fields/text.vue@v3.4 -->

<template>
  <field :state="state"></field>
</template>

<script>
import Field from 'components/Field.vue';

export default {

  name: "field-text",

  props: ['state'],

  components: {
    Field
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
