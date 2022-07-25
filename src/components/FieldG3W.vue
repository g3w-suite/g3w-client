<!-- ORIGINAL SOURCE: -->
<!-- gui/fields/g3w-field.vue@v3.4 -->

<template>
  <component
    :is="type"
    :feature="feature"
    :state="state">
  </component>
</template>

<script>
const fieldsService = require('gui/fields/fieldsservice');
const Fields = require('gui/fields/fields');

export default {
  name: "g3w-field",
  props: {
    state: {
      required: true
    },
    feature: {
      type: Object
    }
  },
  components: {
    ...Fields
  },
  created(){
    this.type = fieldsService.getType(this.state)
  }
};
</script>

<style scoped>

</style>