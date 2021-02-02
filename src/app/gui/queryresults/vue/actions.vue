<template>
  <td v-if="actions.length" class="g3w-feature-actions">
    <span v-if="showAction(action)"
          @click.stop="trigger(action, layer, feature, featureIndex)" v-for="action in actions" v-download="action.download"
          :class="{'toggled': action.state && action.state.toggled[featureIndex] }"
          class="action-button  skin-tooltip-right" data-placement="right" data-toggle="tooltip" v-t-title="action.hint">
      <span :class="`action-button-icon ${action.class}`"></span>
    </span>
  </td>
</template>

<script>
  export default {
    name: "actions",
    props: {
      featureIndex: {
        type: Number
      },
      feature: {
        type: Object
      },
      layer: {
        type: Object
      },
      trigger: {
        type: Function
      },
      actions: {
        type: Array,
        default: []
      },
    },
    methods: {
      showAction(action){
        action.init && action.init({feature: this.feature, index:this.featureIndex, action});
        return typeof action.condition === 'function' ? action.condition({layer:this.layer, feature:this.feature}) : true;
      }
    }
  }
</script>

<style scoped>

</style>