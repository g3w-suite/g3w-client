<!--
  @file
  @since v3.7
-->

<template>
   <span
     v-if                      = "show && (undefined === (action.state || {}).show ? show : action.state.show)"
     @contextmenu.prevent.stop = ""
     @click.stop               = "clickAction(action, layer, feature, featureIndex, $event)"
     :class                    = "{'toggled': (action.state || {}).toggled && action.state.toggled[featureIndex] }"
     class                     = "action-button"
     v-disabled                = "ApplicationState.download || !!(action.state || {}).disabled"
     v-t-tooltip:top           = "action.hint">
     <span
       style  = "padding: 2px;"
       :style = "action.style"
       :class = "`action-button-icon ${action.class}`">
     </span>
   </span>
</template>

<script>
  import ApplicationState from 'g3w-state';

  export default {
    name: "action",
    data() {
      return {
        /** @since 4.0.0 */
        ApplicationState,
        show: true
      }
    },
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
      action: {
        type: Object,
        required: true
      },
    },
    methods: {
      async clickAction(action, layer, feature, featureIndex, event) {
        await this.trigger(action, layer, feature, featureIndex);
        this.$emit('action-clicked', action)
      }
    },
    async created() {
      if (this.action.init) {
        this.action.init({ layer: this.layer, feature: this.feature, index: this.featureIndex, action: this.action });
      }
      if (typeof this.action.condition === 'function') {
        const show = this.action.condition({ layer: this.layer, feature: this.feature });
        this.show = show instanceof Promise ? await show: show;
      }
    },
    beforeDestroy() {
      if (typeof this.action.clear === 'function') {
        this.action.clear({ action: this.action, layer: this.layer, feature: this.feature });
      }
    }
  }
</script>