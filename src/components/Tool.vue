<!--
  @file
  @since v3.7
-->

<template>
  <div>

    <!-- CHECKBOX -->
    <div
      v-if  = "'checkbox' === tool.type"
      class = "checkbox"
    >
      <label>
        <input
          style   = "cursor:pointer"
          :id     = "tool.layerName"
          v-model = "tool.isCheck"
          type    = "checkbox"
          :value  = "tool.layerName"
          @click  = "tool.action(tool)"
        />
        {{ tool.name }}
      </label>
    </div>

    <div
      v-else
      class             = "tool"
      @click            = "!disabled ? tool.action(tool) : null"
      :class            = "{ tool_disabled: disabled }"
      style             = "position:relative"
      :data-i18n-title  = "sidebarOpen ? null : tool.html ? tool.html.text || tool.name : tool.name"
      data-placement    = "right"
    >
      <bar-loader :loading = "tool.loading"/>
      <i :class = "$fa(tool.icon || 'caret-right')"></i>
      <span 
        v-if  = "tool.html" 
        class = "tool-label"
      >
        <i :class = "tool.html.icon"></i>
        {{ tool.html.text || tool.name}}
      </span>

      <span v-else class = "tool-label" v-t = "tool.name"></span>

      <span
        v-if        = "tool.state.type"  
        @click.stop = "showToolStateMessage"
        class       = "tool_type"
        :style      = "{ color: ({ alert: 'red', info: 'blue', warning: 'orange'})[tool.state.type] }"
      >
        <i :class = "$fa(tool.state.type)"></i>
      </span>

    </div>
  </div>
</template>

<script>
import ApplicationState from 'g3w-state';
import GUI              from 'g3w-app';

export default {
  name: "g3w-tool",
  props: {
    tool: {
      required: true,
      type:     Object,
    }
  },
  methods: {
    showToolStateMessage() {
      GUI.dialog({
        title:   this.tool.state.type.toUpperCase(),
        message: this.tool.state.message,
      });
    },
  },
  computed: {
    disabled() {
      return (!this.tool.offline && !ApplicationState.online) || (this.tool.loading || this.tool.disabled);
    },
    sidebarOpen() {
      return ApplicationState.sidebar.open;
    }
  }
};
</script>

<style scoped>
  .tool_disabled {
    cursor: not-allowed;
  }
  .tool_disabled > span {
    color: #777;
  }
  .tool_type {
    cursor: pointer;
    vertical-align: center;
    position:absolute;
    right: 0;
    top: 0;
    padding: 5px;
  }
</style>