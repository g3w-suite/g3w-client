<template>
  <div class="g3w-layer-positions" :id="ids.layerpositions">
    <div v-for="layerposition in layerpositions" :key="layerposition">
      <input @change="change" class="form-control magic-radio" type="radio" :id="ids[layerposition]" v-model="position" :value="layerposition" :checked="position === layerposition">
      <label :for="ids[layerposition]">{{layerposition.toUpperCase()}}</label>
    </div>
  </div></template>

<script>
  import {MAP_SETTINGS} from "../../../constant";
  const {getUniqueDomId} = require('core/utils/utils');
  export default {
    name: "layerspositions",
    props:{
      position:{
        type: String,
        required: true,
        default: MAP_SETTINGS.LAYER_POSITIONS.default
      }
    },
    data(){
      return {
        layerpositions: MAP_SETTINGS.LAYER_POSITIONS.getPositions()
      }
    },
    methods: {
      change(){console.log(this.position)
        this.$emit('layer-position-change', this.position)
      }
    },
    created(){
      this.ids = {
        layerpositions: getUniqueDomId(),
      };
      this.layerpositions.forEach(layerposition => this.ids[layerposition] = getUniqueDomId());
      this.change();
    }
  }
</script>

<style scoped>

</style>