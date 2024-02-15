<!--
  @file
  @since v3.7
-->

<template>
  <tr>
    <td class="attribute" v-for="attribute in attributesSubset(layer)">
      <span
        v-if="isLink(getLayerField({layer, feature, fieldName: attribute.name}))"
        class="skin-color"
        :class="g3wtemplate.getFontClass('link')">
      </span>

      <span v-else-if="isPhoto(getLayerField({layer, feature, fieldName: attribute.name}))"
        class="skin-color"
        :class="g3wtemplate.getFontClass('image')"></span>

      <span v-else-if="isImage(getLayerField({layer, feature, fieldName: attribute.name}))"
        class="skin-color"
        :class="g3wtemplate.getFontClass('image')"></span>
      <span v-else >{{feature.attributes[attribute.name]}}</span>

    </td>
    <td v-if="!hasLayerOneFeature(layer)">
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