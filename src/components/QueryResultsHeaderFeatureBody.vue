<!--
  @file
  @since v3.7
-->

<template>
  <tr>
    <td
      v-for = "attribute in attributesSubset(layer)"
      class = "attribute"
    >
      <span
        v-if   = "isLink(getLayerField({layer, feature, fieldName: attribute.name}))"
        class  = "skin-color"
        :class = "g3wtemplate.getFontClass('link')">
      </span>

      <g3w-image
        v-else-if = "isPhoto(getLayerField({layer, feature, fieldName: attribute.name})) || isImage(getLayerField({layer, feature, fieldName: attribute.name}))"
        :state    = "getLayerField({layer, feature, fieldName: attribute.name})"/>
      <span v-else v-html = "feature.attributes[attribute.name]"></span>

    </td>
    <td v-if="!hasLayerOneFeature(layer)">
    </td>
  </tr>
</template>

<script>
  import Actions         from 'components/QueryResultsActions.vue';
  import Image           from 'components/FieldImage.vue'
  import { fieldsMixin } from 'mixins';
  
  export default {
    name: "headerfeaturebody",
    mixins : [ fieldsMixin ],
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
      actions: Actions,
      'g3w-image': Image
    }
  }
</script>

<style scoped>
  .noAttributes {
    display: flex;
    justify-content: flex-end;
  }
</style>