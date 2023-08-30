<!--
  @file
  @since v3.7
-->

<template>
  <div>
    <div v-if="tool.type === 'checkbox' " class="checkbox">
      <label>
        <input style="cursor:pointer"
          :id="tool.layerName"
          v-model="tool.isCheck"
          type="checkbox"
          :value="tool.layerName"
          @click="fireAction(tool)">
        {{ tool.name }}
      </label>
    </div>
    <div v-else class="tool" @click="!disabled ? fireAction(tool) : null" :class="{tool_disabled: disabled}" style="position:relative">
      <bar-loader :loading="tool.loading"/>
      <i :class="g3wtemplate.getFontClass(icon)"></i>
      <span v-if="tool.html" >
        <i :class="tool.html.icon"></i>
        {{ tool.html.text || tool.name}}
      </span>
      <span v-else v-t="tool.name"></span>
      <span @click.stop="showToolStateMessage" :style="{color: toolstatecolor}" v-if="tool.state.type" style="cursor: pointer; vertical-align: center; position:absolute; right: 0; top: 0; padding: 5px">
        <i :class="g3wtemplate.getFontClass(tool.state.type)"></i>
      </span>
    </div>
  </div>
</template>

<script>
import ApplicationService from 'services/application';
import GUI from 'services/gui';

const AppState = ApplicationService.getState();

const TOOLSTATE = {
  alert: {
    color: 'red'
  },
  info: {
    color: 'blue'
  },
  warning: {
    color: 'orange'
  }
};

export default {
  name: "g3w-tool",
  props: {
    tool: {
      required: true
    }
  },
  data() {
    return {}
  },
  methods: {
    fireAction(tool) {
      this.tool.action(tool);
    },
    showToolStateMessage(){
      GUI.showModalDialog({
        title: this.tool.state.type.toUpperCase(),
        message: this.tool.state.message
      })
    },
  },
  computed: {
    disabled() {
      return (!this.tool.offline && !AppState.online)  || (this.tool.loading || this.tool.disabled);
    },
    icon() {
      return this.tool.icon || 'caret-right'
    },
    toolstatecolor() {
      return TOOLSTATE[this.tool.state.type].color;
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
</style>