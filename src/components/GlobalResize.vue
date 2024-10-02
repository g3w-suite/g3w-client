<!--
  @file
  @since v3.7
-->

<template>
  <div
    v-show          = "show"
    :id             = "$attrs.id"
    :style          = "style"
    @mousedown.stop = "start"
  ></div>
</template>

<script>
  import GUI from 'services/gui';

  export default {

    name: "g3w-resize",

    props: {

      show: {
        type:     Boolean,
        required: true,
        default:  true
      },

      orientation: {
        type:    String,
        default: 'h'
      },

      where: {
        type:    String,
        default: 'document'
      },

      moveFnc: {
        type: Function,
        default: e => console.log(e)
      },
    },

    computed: {
      style() {
        return {
          minWidth:        '5px',
          backgroundColor: '#dddddd',
          cursor:          this.orientation === 'v' ? 'ns-resize' : 'col-resize',
        }
      }
    },
    methods: {
      wrapMoveFnc(e) {
        this.moveFnc(e);
      },

      start() {
        this.domElementMoveListen.addEventListener('mousemove', this.wrapMoveFnc);
        this.domElementMoveListen.addEventListener('mouseup', this.stop, { once: true });
      },

      async stop() {
        this.domElementMoveListen.removeEventListener('mousemove', this.wrapMoveFnc);
        await this.$nextTick();
        GUI.emit('resize');
      }
    },

    async mounted() {
      this.domElementMoveListen = (
        'content' === this.where
          ? document.getElementById('g3w-view-content')
          : document
      );
    },

    destroyed() {
      this.domElementMoveListen = null;
    },

}
</script>