<template>
  <td v-if="actions.length" class="g3w-feature-actions">
    <span v-if="showAction(action)"
      v-for="action in actions" :key="action.id" v-download="action.download"
      :class="{'toggled': action.state && action.state.toggled[featureIndex] }"
      class="action-button skin-tooltip-right" data-placement="right" data-toggle="tooltip" v-t-title="action.hint">
      <span style="padding: 2px;" @click.stop="clickAction(action, layer, feature, featureIndex, $event)" :style="action.style" :class="`action-button-icon ${action.class}`"></span>
    </span>
  </td>
</template>

<script>
  const {t} = require('core/i18n/i18n.service');
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
      },
      async clickAction(action, layer, feature, featureIndex, event){
        await this.trigger(action, layer, feature, featureIndex);
        if (action.hint_change) {
          const element = $(event.target).parent();
          const originalDataTitle = element.attr('data-original-title');
          element.attr('data-original-title', t(action.hint_change.hint));
          element.tooltip('show');
          setTimeout(()=>{
            element.attr('data-original-title', originalDataTitle);
            element.tooltip('show');
          }, action.hint_change.duration || 600)
        }
      }
    },
    async mounted(){
      await this.$nextTick();
      $('.action-button[data-toggle="tooltip"]').tooltip();
    }
  }
</script>

<style scoped>

</style>