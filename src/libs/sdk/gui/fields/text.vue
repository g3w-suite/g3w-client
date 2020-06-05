<template>
  <field :state="state"></field>
</template>

<script>
  import Field from './field.vue';
  export default {
    name: "text",
    props: ['state'],
    components: {
      Field
    },
    created() {}
  }
</script>

<style scoped>
  .field_text_table {
    background-color: transparent !important;
  }
  .field_text_table .field_label {
    font-weight: bold;
  }
</style>
