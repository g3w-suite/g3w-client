<!-- ORIGINAL SORUCE: -->
<!-- gui/fields/text.vue@v3.4 -->

<template>
  <field :state = "state"/>
</template>

<script>
import Field from 'components/Field.vue';

export default {

  /** @since 3.8.6 */
  name: "field-text",

  props: ['state'],

  components: {
    Field
  },

  created() {},

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
