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
      class  = "tool"
      @click = "!disabled ? tool.action(tool) : null"
      :class = "{ tool_disabled: disabled }"
      style  = "position:relative"
    >

      <bar-loader :loading="tool.loading"/>

      <i :class="g3wtemplate.getFontClass(tool.icon || 'caret-right')"></i>

      <span v-if="tool.html" >
        <i :class="tool.html.icon"></i>
        {{ tool.html.text || tool.name}}
      </span>

      <span v-else v-t="tool.name"></span>

      <span
        v-if        = "tool.state.type"  
        @click.stop = "showToolStateMessage"
        class       = "tool_type"
        :style      = "{ color: ({ alert: 'red', info: 'blue', warning: 'orange'})[tool.state.type] }"
      >
        <i :class="g3wtemplate.getFontClass(tool.state.type)"></i>
      </span>

    </div>
  </div>
</template>

<script>
import ApplicationService from 'services/application';
import GUI from 'services/gui';

export default {
  name: "g3w-tool",
  props: ['tool'],
  methods: {
    showToolStateMessage() {
      GUI.showModalDialog({ title: this.tool.state.type.toUpperCase(), message: this.tool.state.message });
    },
  },
  computed: {
    disabled() {
      return (!this.tool.offline && !ApplicationService.getState().online) || (this.tool.loading || this.tool.disabled);
    },
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