<template>
  <span>
    <input type="checkbox" :id="id" @click.stop="select($event)" :checked="feature.selected" class="magic-checkbox">
    <label :for="id"><span style="padding-left:1px"></span></label>
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
      select(evt){
        evt.stopImmediatePropagation();
        this.feature.selected = !this.feature.selected;
        this.$emit('checked', this.feature);
      }
    }
  }
</script>

<style scoped>

</style>