<template>
  <div v-show="show" :id="$attrs.id" :style="style" @mousedown.stop="start" ></div>
</template>

<script>
  import GUI  from 'gui/gui';
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
      wrapMoveFnc(evt) {
        this.domElementMoveListen.addEventListener('mouseup', this.stop, {once: true});
        this.moveFnc(evt);
      },
      start(){
        this.domElementMoveListen.addEventListener('mousemove', this.wrapMoveFnc);
      },
      async stop(){
        this.domElementMoveListen.removeEventListener('mousemove', this.wrapMoveFnc);
        await this.$nextTick();
        GUI.emit('resize');
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
      this.domElementMoveListen = null;
    }
  }
</script>

<style scoped></style>