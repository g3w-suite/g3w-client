<!--
  @file
  @since v3.7
-->

<template>
  <div
    class = "g3w-layer-positions"
    :id   = "ids.layerpositions"
  >
    <div
      class = "g3w-layer-positions-info-message"
      v-t   = "`layer_position.message`">
    </div>
    <div class = "g3w-layer-positions-checkboxes">
      <div
        v-for = "layerposition in layerpositions"
        :key  = "layerposition"
        style = "margin: 0 5px;"
      >
        <input
          @change  = "change"
          class    = "form-control magic-radio"
          type     = "radio"
          :id      = "ids[layerposition]"
          v-model  = "position"
          :value   = "layerposition"
          :checked = "position === layerposition">
        <label :for = "ids[layerposition]" v-t = "`layer_position.${layerposition}`"></label>
      </div>
    </div>
  </div>
</template>

<script>
  import { getUniqueDomId } from 'utils/getUniqueDomId';

  export default {
    name: "layerspositions",
    props:{
      position: {
        type:    String,
        default: 'top'
      }
    },
    data() {
      return {
        layerpositions: [ 'top', 'bottom' ]
      }
    },
    methods: {
      change() {
        this.$emit('layer-position-change', this.position)
      }
    },
    created() {
      this.ids = {
        layerpositions: getUniqueDomId(),
      };
      this.layerpositions.forEach(lp => this.ids[lp] = getUniqueDomId());
      this.change();
    }
  }
</script>

<style scoped>
  .g3w-layer-positions {
    display: flex;
    flex-direction: column;
    margin: 5px 0 5px 0;
  }
  .g3w-layer-positions-info-message {
    margin-bottom: 5px;
    font-weight: bold;
  }
  .g3w-layer-positions-checkboxes {
    display: flex;
    justify-content: space-between;
  }
</style>