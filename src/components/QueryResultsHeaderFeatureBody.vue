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

    <td v-for="attr in attributesSubset(layer)" class="attribute">
      <span v-if="getIcon(attr)" class="skin-color" :class="getIcon(attr)"></span>
      <span v-else>{{feature.attributes[attr.name]}}</span>
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
       * @since 3.9.0
       */
      getIcon(attr) {

        const field = this.getLayerField({
          layer:     this.layer,
          feature:   this.feature,
          fieldName: attr.name,
        });

        const service = G3WField.methods.getFieldService();

        if (service.isLink(field)) {
          return this.g3wtemplate.getFontClass('link');
        }

        if (service.isPhoto(field) || service.isImage(field)) {
          return this.g3wtemplate.getFontClass('image');
        }

        return '';

      }

    }

  }
</script>

<style scoped>
  .noAttributes {
    display: flex;
    justify-content: flex-end;
  }
</style>