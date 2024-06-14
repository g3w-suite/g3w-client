<!--
  @file
  @since v3.7
-->

<template>
  <div style = "display: flex; justify-content: space-between">
    <i
      v-if                      = "show"
      :class                    = "g3wtemplate.getFontClass(`resize-${this.type}`)"
      v-t-tooltip:bottom.create = "'enlange_reduce'"
      style                     = "cursor: pointer; margin-right: 3px;"
      class                     = "action-button skin-color-dark"
      @click                    = "toggleFull"
    ></i>
    <i
      :class                    = "g3wtemplate.getFontClass(`resize-default`)"
      v-t-tooltip:left.create   = "'reset_default'"
      style                     = "cursor: pointer"
      class                     = "action-button skin-color-dark"
      @click                    = "resetToDefault"
    ></i>
  </div>
</template>

<script>
  import GUI from 'services/gui';

  export default {

    name: 'resize-icon',

    props: {

      type: {
        type:    String,
        default: 'h',
      },

    },

    data() {
      return {
        show: undefined !== this.type,
      };
    },

    watch: {

      async type() {
        this.show = false;
        await this.$nextTick();
        this.show = true;
      },

    },

    methods:{

      toggleFull() {
        GUI.toggleFullViewContent();
        GUI.emit('resize');
      },

      resetToDefault() {
        GUI.resetToDefaultContentPercentage();
        GUI.emit('resize');
      },

    },

  };
</script>
