<!--
  @file
  @since v3.7
-->

<template>
   <span
     v-if                      = "show"
     @contextmenu.prevent.stop = ""
     @click.stop               = "clickAction(action, layer, feature, featureIndex, $event)"
     v-download                = "action.download"
     :class                    = "{'toggled': action.state && action.state.toggled[featureIndex] }"
     class                     = "action-button"
     v-t-tooltip:top.create    = "action.hint">
     <span
       style  = "padding: 2px;"
       :style = "action.style"
       :class = "`action-button-icon ${action.class}`">
     </span>
   </span>
</template>

<script>
  const { t } = require('core/i18n/i18n.service');

  export default {
    name: "action",
    data() {
      return {
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
        if (action.hint_change) {
          const element = $(event.target).parent();
          const originalDataTitle = element.attr('data-original-title');
          element.attr('data-original-title', t(action.hint_change.hint));
          element.tooltip('show');
          setTimeout(() => {
            element.attr('data-original-title', originalDataTitle);
            element.tooltip('show');
          }, action.hint_change.duration || 600)
        }
        this.$emit('action-clicked', action)
      }
    },
    async created() {
      if (this.action.init) {
        this.action.init({layer: this.layer, feature: this.feature, index:this.featureIndex, action:this.action});
      }
      if (typeof this.action.condition === 'function') {
        const show = this.action.condition({ layer: this.layer, feature: this.feature });
        this.show = show instanceof Promise ? await show: show;
      }
    },
  }
</script>