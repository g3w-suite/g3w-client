<template>
    <span  @click.stop="action.fnc" v-t-tooltip:left.create="action.tooltip" style="font-weight: bold; padding:3px;" :class="action.class" class="action skin-tooltip-left" :style="action.style">
    </span>
</template>

<script>
  export default {
    name: 'Sidebaritemaction',
    props: {
      action: {
        type: Object,
        required: true
      }
    }
  };
</script>
