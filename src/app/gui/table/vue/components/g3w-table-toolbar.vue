<template>
  <div v-show="tools.show" style="display: flex; justify-content: space-between; padding: 1px;">
    <div class="skin-color action-button skin-tooltip-right" data-placement="right" data-toggle="tooltip" :class="g3wtemplate.getFontClass('clear')" v-t-tooltip.create="'layer_selection_filter.tools.clear'" @click.stop="clearAllSelection"></div>
    <div class="skin-color action-button skin-tooltip-right" data-placement="right" data-toggle="tooltip" :class="[g3wtemplate.getFontClass('invert'), tools.filter.active ? 'g3w-disabled': '']" v-t-tooltip.create="'layer_selection_filter.tools.invert'"   @click.stop="switchSelection"></div>
    <div class="skin-color action-button skin-tooltip-right" data-placement="right" data-toggle="tooltip"  @click.stop="toggleFilterToken" :class="[g3wtemplate.getFontClass('filter'), tools.filter.active ? 'toggled' : '']" v-t-tooltip.create="'layer_selection_filter.tools.filter'"></div>
  </div>
</template>

<script>
  export default {
    name: "g3w-table-toolbar",
    props: {
      tools: {
        type: Object
      },
      switchSelection: {
        type: Function
      },
      clearAllSelection: {
        type: Function
      },
      toggleFilterToken: {
        type: Function
      }
    }
  }
</script>

<style scoped>
  .action-button {
    padding: 4px;
  }
  .action-button.toggled {
    border: 1px solid #cccccc;
  }
</style>