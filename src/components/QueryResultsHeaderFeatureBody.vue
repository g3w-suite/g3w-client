<!--
  @file
  @since v3.7
-->

<template>
  <tr
    @click     = "toggleFeatureBoxAndZoom(layer,feature)"
    @mouseover = "trigger({id:'highlightgeometry'}, layer, feature, index)"
    @mouseout  = "trigger({id:'clearHighlightGeometry'}, layer, feature, index)"
    class      = "featurebox-header"
    :class     = "[boxLayerFeature.collapsed ? '' : 'featurebox-header-open']"
  >

    <actions
      :layer        = "layer"
      :featureIndex = "index"
      :trigger      = "trigger"
      :feature      = "feature"
      :actions      = "actions"
    />

    <td
      v-for = "attribute in attributesSubset(layer)"
      class = "attribute"
    >
      <span
        v-if      = "isLink(getLayerField({layer, feature, fieldName: attribute.name}))"
        class     = "skin-color"
        :class    = "g3wtemplate.getFontClass('link')"
      ></span>
      <span
        v-else-if = "isPhoto(getLayerField({layer, feature, fieldName: attribute.name}))"
        class     = "skin-color"
        :class    = "g3wtemplate.getFontClass('image')"
      ></span>
      <span 
        v-else-if = "isImage(getLayerField({layer, feature, fieldName: attribute.name}))"
        class     = "skin-color"
        :class    = "g3wtemplate.getFontClass('image')"
      ></span>
      <span v-else>{{feature.attributes[attribute.name]}}</span>
    </td>

    <td
      v-if   = "!hasLayerOneFeature(layer)"
      class  = "collapsed"
      :class = "{noAttributes: (0 === attributesSubset(layer).length) }"
    >
      <span
        class="fa link morelink skin-color"
        :class="[g3wtemplate.font[boxLayerFeature.collapsed ? 'plus' : 'minus']]"
      ></span>
    </td>

  </tr>
</template>

<script>
  import Actions  from 'components/QueryResultsActions.vue';
  import G3WField from 'components/G3WField.vue';

  Object
    .entries({
      Actions,
      G3WField,
    })
    .forEach(([k, v]) => console.assert(undefined !== v, `${k} is undefined`));
  
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

      boxLayerFeature: {
        type: Object
      },

      getLayerField: {
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

      index: {
        type: Number
      },

      actions: {
        type: Array
      },

    },

    components: {
      actions: Actions,
      ...G3WField.components,
    },

    methods: {

      /**
       * ORIGINAL SOURCE: src/mixins/fields.js@3.8 
       */
      isLink(field) {
        return G3WField.methods.getFieldService().isLink(field);
      },

      /**
       * ORIGINAL SOURCE: src/mixins/fields.js@3.8 
       */
      isImage(field) {
        return G3WField.methods.getFieldService().isImage(field);
      },

      /**
       * ORIGINAL SOURCE: src/mixins/fields.js@3.8 
       */
      isPhoto(field) {
        return G3WField.methods.getFieldService().isPhoto(field);
      },

    }

  }
</script>

<style scoped>
  .noAttributes {
    display: flex;
    justify-content: flex-end;
  }
</style>