<!--
  @file
  @since v3.7
-->

<template>
  <ul class="g3w-tools treeview-menu">
    <bar-loader :loading="state.loading"/>
    <li v-for="group in state.toolsGroups" :key="group.name">
      <div class="tool-header">
        <i :class="g3wtemplate.getFontClass('tool')"></i>
        <span style="">{{ group.name }}</span>
      </div>
      <div :id="group.name + '-tools'" class="tool-box">
        <g3w-tool v-for="tool in group.tools" :key="tool.name" :tool="tool"></g3w-tool>
      </div>
    </li>
  </ul>
</template>

<script>
import G3wTool from 'components/Tool.vue';

export default {

  /** @since 3.8.6 */
  name: 'g3w-tools',

  data() {
    return {
      state: null
    }
  },
  watch: {
    'state.toolsGroups': {
      handler(groups) {
        this.$emit('visible', groups.length > 0);
      }
    }
  },
  components: {
    G3wTool
  }
};
</script>