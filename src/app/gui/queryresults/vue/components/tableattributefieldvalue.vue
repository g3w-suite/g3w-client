<template>
    <span v-if="isSimple(value)" v-html="value"></span>
    <g3w-image v-else-if="isPhoto(value)" :value="value"></g3w-image>
    <g3w-image v-else-if="isImage(value)" :value="attribute.value"></g3w-image>
    <g3w-link v-else-if="isLink(value)" :state="{value: value}"></g3w-link>
    <g3w-vue v-else-if="isVue(value)" :state="{value: value}"></g3w-vue>
</template>

<script>
  import Link from '../../../fields/link.vue';
  import VueField from '../../../fields/vuefield.vue';
  const {fieldsMixin} = require('gui/vue/vue.mixins');
  export default {
    name: "tableattributefieldvalue",
    props: {
      layer: {
        type: Object
      },
      feature: {
        type: Object
      },
      attribute: {
        type: String
      }
    },
    mixins: [fieldsMixin],
    components: {
      'g3w-link': Link,
      'g3w-vue': VueField,
    },
    computed: {
      value(){
        return this.feature.attributes[this.attribute.name];
      }
    }
  }
</script>

<style scoped>

</style>