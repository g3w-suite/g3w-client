<!--
  @file
  @since v3.7
-->

<template>
    <g3w-vue   v-if     ="isVue(field)"    :feature="feature" :state="field"/>
    <span      v-else-if="isSimple(field)" v-html="field.value"></span>
    <g3w-image v-else-if="isPhoto(field)"  :value="field.value"/>
    <g3w-image v-else-if="isImage(field)"  :value="field.value"/>
    <g3w-link  v-else-if="isLink(field)"   :state="{value: field.value}"/>
</template>

<script>
  import G3WField from 'components/G3WField.vue';

  console.assert(undefined !== G3WField, 'G3WField is undefined');

  export default {

    name: "tableattributefieldvalue",

    props: {

      field: {
        type: Object
      },

      feature: {
          type: Object
      },

    },

    components: G3WField.components,

    methods: {

      /**
       * ORIGINAL SOURCE: src/mixins/fields.js@3.8 
       */
      isSimple(field) {
        return G3WField.methods.getFieldService().isSimple(field);
      },

      /**
       * ORIGINAL SOURCE: src/mixins/fields.js@3.8 
       */
      isLink(field) {
        return G3WField.methods.getFieldService().isLink(field);
      },

      /**
       * ORIGINAL SOURCE: src/mixins/fields.js@3.8 
       */
      isImage(field) {
        return G3WField.methods.getFieldService().isImage(field);
      },

      /**
       * ORIGINAL SOURCE: src/mixins/fields.js@3.8 
       */
      isPhoto(field) {
        return G3WField.methods.getFieldService().isPhoto(field);
      },

      /**
       * ORIGINAL SOURCE: src/mixins/fields.js@3.8 
       */
      isVue(field) {
        return G3WField.methods.getFieldService().isVue(field);
      },

    },

  };
</script>