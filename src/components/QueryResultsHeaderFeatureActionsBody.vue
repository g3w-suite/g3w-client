<!--
  @file
  @since v3.7
-->

<template>
  <tr
    @mouseover="trigger({id:'highlightgeometry'}, layer, feature, index)"
    @mouseout="trigger({id:'clearHighlightGeometry'}, layer, feature, index)"
    class="featurebox-header">
    <actions
      :colspan="colspan"
      :layer="layer"
      :featureIndex="index"
      :trigger="trigger"
      :feature="feature"
      :actions="actions"/>
  </tr>
</template>

<script>
  import Actions from 'components/QueryResultsActions.vue';
  import { fieldsMixin } from 'mixins';
  
  export default {
    name: "headerfeaturebody",
    mixins : [fieldsMixin],
    props: {
      toggleFeatureBoxAndZoom: {
        type: Function
      },
      trigger: {
        type: Function
      },
      hasLayerOneFeature: {
        type: Function
      },
      boxLayerFeature: {
        type: Object
      },
      getLayerField:{
        type: Function,
      },
      attributesSubset:{
        type: Function
      },
      layer: {
        type: Object
      },
      feature: {
        type: Object
      },
      index:{
        type: Number
      },
      actions:{
        type: Array
      },
      colspan: {
        type: Number
      }
    },
    components: {
      actions:Actions
    }
  }
</script>

<style scoped>
  .noAttributes {
    display: flex;
    justify-content: flex-end;
  }
</style>