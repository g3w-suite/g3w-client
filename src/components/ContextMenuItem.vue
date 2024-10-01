<!--
  @file inspired by: https://github.com/Rudeus3Greyrat/vue-context-menu/ (v1.9.0)
  @since 3.9.0

  @example see components/ContextMenu.vue
-->
<template>
  <li
    @click.stop = "$parent.$emit('select', select)"
    :style      = "{ opacity: this.disabled ? '0.5' : '1' }"
  >
    <slot></slot>
  </li>
</template>
  
<script>
export default {
  name: "ContextMenuItem",

  props: {

    select: {
      type: String | Number | Object,
      default: '',
    },

  },

};
</script>
  
<style scoped>
  li {
    display: block;
    min-width: 3rem;
    height: 2rem;
    line-height: 2rem;
    font-size: 0.8rem;
    text-align: center;
    margin: 0;
  }

  li:hover {
    background-color: darkgrey;
    cursor: pointer;
  }
</style>