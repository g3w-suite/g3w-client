<!-- ORIGINAL SOURCE: -->
<!-- gui/vue/global-components/resize-icon.vue@v3.4 -->

<template>
  <div>
      <i :class="g3wtemplate.getFontClass(`resize-${type}`)" v-t-tooltip:bottom.create="'enlange_reduce'" style="cursor: pointer; margin-right: 3px;" class="action-button skin-color-dark" @click="toggleFull"></i>
      <i :class="g3wtemplate.getFontClass(`resize-default`)" v-t-tooltip:left.create="'reset_default'" style="cursor: pointer" class="action-button skin-color-dark" @click="resetToDefault"></i>
  </div>
</template>

<script>
  const GUI = require('gui/gui');

  export default {
      name: 'resize-icon',
      props: {
        type: {
            type: String,
            default: 'h'
        }
      },
      computed(){},
      methods:{
          toggleFull(){
              GUI.toggleFullViewContent();
              GUI.emit('resize');
          },
          resetToDefault(){
              GUI.resetToDefaultContentPercentage();
              GUI.emit('resize');
          }
      }
  };
</script>
