<template>
  <div style="width:100%">
    <h5 class="skin-background-color g3w-polygonattributes-types-title" v-t="'sdk.mapcontrols.querybypolygon.download.title'"></h5>
    <div class="g3w-polygonattributes-types-content">
      <div class="g3w-polygonattributes-types-radio">
        <template v-for="radio in config.choices">
          <input :id="radio.id" :value="radio.type" style="width:100%" class="magic-radio" v-model="type" type="radio">
          <label :for="radio.id" v-t="radio.label"></label>
        </template>
      </div>
      <div class="g3w-polygonattributes-buttons">
        <button class="btn skin-button" @click.stop=config.download(type)>
          <span :class="g3wtemplate.getFontClass('download')"></span>
        </button>
      </div>
    </div>
  </div>

</template>

<script>
  export default {
    name: "querypolygonaddattributes",
    props: {
      layer: {
        type: Object
      },
      config: {
        type: Object,
        default: null
      },
    },
    data(){
      return {
        type: this.config.choices[0].type
      }
    }
  }
</script>

<style scoped>
  .g3w-polygonattributes-types-title{
    font-weight: bold;
    padding: 3px;
    color: white;
    margin: 0 0 5px 0;
  }
  .g3w-polygonattributes-types-content{
    display: flex;
    justify-content: space-between;
    padding: 3px;
    border-radius: 3px;
    border: 1px solid #f4f4f4;
  }
  .g3w-polygonattributes-types-radio{
    display: flex;
    flex-direction: column;
  }
  .g3w-polygonattributes-types-radio label{
    font-size: 1em !important;
    font-weight: normal !important;
  }
  .g3w-polygonattributes-buttons{
    display: flex;
    justify-content: flex-end;
  }
  .g3w-polygonattributes-buttons button {
    margin: 2px;
    border-radius: 3px;
  }

</style>