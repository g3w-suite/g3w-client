<!--
  @file
  @since v3.7
-->

<template>
  <div style="display: flex; justify-content: space-between; padding: 1px;">

    <!--  Filter features based on element on current map extent tool    -->
    <div
      v-if               = "tools.geolayer.show"
      class              = "skin-color action-button skin-tooltip-right"
      data-placement     = "right"
      v-disabled         = "disableMapTool"
      data-toggle        = "tooltip"
      data-container     = "body"
      :class             = "[
        g3wtemplate.getFontClass('map'),
        tools.geolayer.active ? 'toggled' : '',
      ]"
      v-t-tooltip.create = "'layer_selection_filter.tools.show_features_on_map'"
      @click.stop        = "getDataFromBBOX"
    ></div>

    <!-- Clear all selection tool      -->
    <div
      v-show             = "tools.show"
      class              = "skin-color action-button skin-tooltip-right"
      data-placement     = "right"
      data-toggle        = "tooltip"
      data-container     = "body"
      :class             = "g3wtemplate.getFontClass('clear')"
      v-t-tooltip.create = "'layer_selection_filter.tools.clear'"
      @click.stop        = "clearAllSelection"
    ></div>

    <!-- Incert selection tool     -->
    <div
      v-show             = "tools.show"
      class              = "skin-color action-button skin-tooltip-right"
      data-placement     = "right"
      data-toggle        = "tooltip"
      data-container     = "body"
      :class             = "[
        g3wtemplate.getFontClass('invert'),
        tools.filter.active ? 'g3w-disabled': ''
      ]"
      v-t-tooltip.create = "'layer_selection_filter.tools.invert'"
      @click.stop        = "switchSelection"
    ></div>

    <!-- Toogle tool filter layer    -->
    <div
      v-show             = "tools.show"
      class              = "skin-color action-button skin-tooltip-right"
      data-placement     = "right"
      data-toggle        = "tooltip"
      data-container     = "body"
      @click.stop        = "toggleFilterToken"
      :class             = "[
        g3wtemplate.getFontClass('filter'),
        tools.filter.active ? 'toggled' : ''
      ]"
      v-t-tooltip.create = "'layer_selection_filter.tools.filter'"
    ></div>

  </div>
</template>

<script>
import ApplicationState from 'store/application-state';

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
    },
    getDataFromBBOX: {
      type: Function
    }
  },
  computed: {
    disableMapTool() {
      return !this.tools.geolayer.active &&
        ApplicationState.gui.layout[ApplicationState.gui.layout.__current].rightpanel.height_100;
    }
  }
};
</script>

<style scoped>
  .action-button {
    padding: 4px;
  }
  .action-button.toggled {
    border: 1px solid #cccccc;
  }
</style>