<!--
  @file
  @since v3.7
-->

<template>
  <tr @click="toggleFeatureBoxAndZoom(layer,feature)"
      @mouseover="trigger({id:'highlightgeometry'}, layer, feature, index)"
      @mouseout="trigger({id:'clearHighlightGeometry'}, layer, feature, index)" class="featurebox-header"
      :class="[boxLayerFeature.collapsed ? '' : 'featurebox-header-open']">
    <actions :layer="layer" :featureIndex="index" :trigger="trigger" :feature="feature" :actions="actions"></actions>
    <td class="attribute" v-for="attribute in attributesSubset(layer)">
      <span class="skin-color" v-if="isLink(getLayerField({layer, feature, fieldName: attribute.name}))" :class="g3wtemplate.getFontClass('link')"></span>
      <span class="skin-color" v-else-if="isPhoto(getLayerField({layer, feature, fieldName: attribute.name}))" :class="g3wtemplate.getFontClass('image')"></span>
      <span class="skin-color" v-else-if="isImage(getLayerField({layer, feature, fieldName: attribute.name}))" :class="g3wtemplate.getFontClass('image')"></span>
      <span v-else >{{feature.attributes[attribute.name]}}</span>
    </td>
    <td class="collapsed" v-if="!hasLayerOneFeature(layer)" :class="{noAttributes: attributesSubset(layer).length === 0}">
      <span class="fa link morelink skin-color" :class="[boxLayerFeature.collapsed ? g3wtemplate.font['plus'] : g3wtemplate.font['minus']]"></span>
    </td>
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