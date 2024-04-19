<!-- 
  @since v3.7.0
-->

<template>
  <span
    @click.stop             = "triggerAction"
    v-t-tooltip:left.create = "action.tooltip"
    style                   = "font-weight: bold; padding:3px;"
    :class                  = "action.class"
    class                   = "action skin-tooltip-left"
    :style                  = "action.style"
  ></span>
</template>

<script>
  export default {
    name: 'Sidebaritemaction',
    props: {
      action: {
        type:     Object,
        required: true
      },
      component: {
        type: Object
      }
    },
    methods: {
      triggerAction() {
        this.action.fnc(this.component)
      }
    }
  };
</script>
