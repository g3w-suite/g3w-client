<template>
  <tr @click="toggleFeatureBoxAndZoom(layer,feature)"
      @mouseover="trigger({id:'highlightgeometry'},layer,feature, index)"
      @mouseout="trigger({id:'clearHighlightGeometry'}, layer, feature, index)" class="featurebox-header"
      :class="[collapsedFeatureBox(layer,feature) && layer.features.length > 1 ? '' : 'featurebox-header-open']">
    <actions :layer="layer" :featureIndex="index" :trigger="trigger" :feature="feature" :actions="actions"></actions>
    <td class="attribute" v-for="attribute in attributesSubset(layer.attributes)">
      <span>{{feature.attributes[attribute.name]}}</span>
    </td>
    <td class="collapsed" v-if="!hasLayerOneFeature(layer)">
      <span class="fa link morelink skin-color" :class="[collapsedFeatureBox(layer,feature) ? g3wtemplate.font['plus'] : g3wtemplate.font['minus']]"></span>
    </td>
  </tr>
</template>

<script>
  import Actions from './actions.vue'
  export default {
    name: "headerfeaturebody",
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
      collapsedFeatureBox: {
        type: Function
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
      }
    },
    components: {
      actions:Actions
    }
  }
</script>

<style scoped>

</style>