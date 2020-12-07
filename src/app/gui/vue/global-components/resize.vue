<template>
  <div v-show="show" :id="$attrs.id" :style="style" @mousedown.stop="start" ></div>
</template>

<script>
  const GUI = require('gui/gui');
  export default {
    name: "g3w-resize",
    props: {
      show: {
        type: Boolean,
        required: true,
        default: true
      },
      orientation: {
        type: String,
        required: true,
        default: 'h'
      },
      where: {
        type: 'string',
        default: 'document'
      },
      moveFnc: {
        type: Function,
        default: evt=> console.log(evt)
      },
      style:{
        type: Object,
        default: {}
      }
    },
    methods: {
      start(){
        this.domElementMoveListen.addEventListener('mousemove', this.moveFnc);
        this.domElementMoveListen.addEventListener('mouseup', this.stop)
      },
      async stop(emit=true){
        this.domElementMoveListen.removeEventListener('mousemove', this.moveFnc);
        await this.$nextTick();
        emit && GUI.emit('resize');
      }
    },
    watch:{
      'orientation':{
        handler(orientation){
          this.style.cursor = orientation === 'v' ? 'ns-resize' : 'col-resize';
        },
        immediate: true
      }
    },
    async mounted() {
      this.domElementMoveListen;
      this.style = {
        minWidth: '5px',
        backgroundColor: '#dddddd',
        cursor: 'col-resize',
        ...this.style,
      };
      switch(this.where) {
        case 'content':
          this.domElementMoveListen = document.getElementById('g3w-view-content');
          break;
        case 'document':
        default:
          this.domElementMoveListen = document;
      }
    },
    destroyed() {
      this.stop(false);
      this.domElementMoveListen = null;
    }
  }
</script>

<style scoped>

</style>