<template>
    <g3w-vue v-if="isVue(field)" :feature="feature" :state="field"></g3w-vue>
    <span v-else-if="isSimple(field)" v-html="field.value"></span>
    <g3w-image v-else-if="isPhoto(field)" :value="field.value"></g3w-image>
    <g3w-image v-else-if="isImage(field)" :value="field.value"></g3w-image>
    <g3w-link v-else-if="isLink(field)" :state="{value: field.value}"></g3w-link>
</template>

<script>
  import Link from '../../../fields/link.vue';
  import VueField from '../../../fields/vuefield.vue';
  import  {fieldsMixin}  from 'gui/vue/vue.mixins';
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
    mixins: [fieldsMixin],
    components: {
      'g3w-link': Link,
      'g3w-vue': VueField,
    }
  }
</script>

<style scoped>

</style>