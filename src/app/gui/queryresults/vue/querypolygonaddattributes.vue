<template>
  <div>
    <h4 style="font-weight: bold" class="skin-color" v-t="'sdk.mapcontrols.querybypolygon.download.title'"></h4>
    <div class="g3w-polygonattributes-buttons">
      <button v-for="button in buttons" :key="button.type" class="btn skin-button skin-tooltip-top g3w-polygon-button" @click="onClick(button.type)"
        data-placement="top" data-toggle="tooltip" v-t-tooltip.create="button.tooltip" v-t="button.label">
      </button>
    </div>
  </div>

</template>

<script>
  export default {
    name: "querypolygonaddattributes",
    computed: {
      buttons(){
        return this.$options.service.state.buttons;
      }
    },
    methods: {
      onClick(type){
        this.$options.service.onClick(type);
      }
    },
  }
</script>

<style scoped>
  .g3w-polygonattributes-buttons{
    display: flex;
    background-color: #ffffff;
    padding: 15px;
    border-radius: 3px;
    justify-content: space-around;
    margin-top: 10px;
    width: 100%;
  }
  .g3w-polygon-button {
    box-shadow: 0 2px 5px rgba(0,0,0, 0.6);
    border-radius: 3px;
  }
</style>