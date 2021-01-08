<template>
  <span>
    <input type="checkbox" :id="id" :checked="feature.selected" class="magic-checkbox">
    <label @click.capture.stop.prevent="select" :for="id">
      <span></span>
    </label>
  </span>
</template>

<script>
  const {getUniqueDomId} = require('core/utils/utils');
  export default {
    name: "select-row",
    props: {
      feature: {
        required: true
      }
    },
    data(){
      return {
        id: getUniqueDomId()
      }
    },
    methods: {
      select(){
        this.$emit('selected', this.feature);
      }
    },
    destroyed(){
      this.$off('selected')
    }
  }
</script>

<style scoped>

</style>