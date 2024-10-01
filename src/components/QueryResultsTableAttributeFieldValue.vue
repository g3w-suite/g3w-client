<!--
  @file
  @since v3.7
-->

<template>
    <g3w-vue   v-if      = "isVue(field)"   :feature = "feature" :state = "field"/>
    <span      v-else-if = "isSimple(field)" v-html = "field.value"></span>
    <g3w-image v-else-if = "isPhoto(field)" :value = "field.value"/>
    <g3w-image v-else-if = "isImage(field)" :value = "field.value"/>
    <g3w-link  v-else-if = "isLink(field)"  :state = "{value: field.value}"/>
</template>

<script>
  import Link            from 'components/FieldLink.vue';
  import VueField        from 'components/FieldVue.vue';
  import { fieldsMixin } from 'mixins';

  export default {
    name: "tableattributefieldvalue",
    props: {
      field: {
        type: Object
      },
      feature: {
        type: Object
      }
    },
    mixins: [ fieldsMixin ],
    components: {
      'g3w-link': Link,
      'g3w-vue':  VueField,
    }
  }
</script>

<style scoped>

</style>