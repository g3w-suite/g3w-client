<!-- ORIGINAL SORUCE: -->
<!-- gui/fields/text.vue@v3.4 -->

<template>
  <field :state="state">
    <span v-if="state.label" slot="label">{{state.label}}</span>
    <span v-if="state.value" slot="field" style="word-wrap: break-word;" v-html="state.value"></span>
  </field>
</template>

<script>
import Field from 'components/Field.vue';

export default {
  name: "text",
  props: ['state'],
  components: {
    Field
  },
  created() {}
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
