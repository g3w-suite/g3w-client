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
        type: Boolean,
        required: true,
        default: true
      },

      orientation: {
        type: String,
        default: 'h'
      },

      where: {
        type: String,
        default: 'document'
      },

      moveFnc: {
        type: Function,
        default: evt=> console.log(evt)
      },

      style: {
        type: Object,
        default: () => ({})
      },

    },

    methods: {

      wrapMoveFnc(evt) {
        this.domElementMoveListen.addEventListener('mouseup', this.stop, { once: true });
        this.moveFnc(evt);
      },

      start() {
        this.domElementMoveListen.addEventListener('mousemove', this.wrapMoveFnc);
      },

      async stop() {
        this.domElementMoveListen.removeEventListener('mousemove', this.wrapMoveFnc);
        await this.$nextTick();
        GUI.emit('resize');
      },

    },

    watch: {

      'orientation': {
        handler(orientation) {
          this.style.cursor = 'v' === orientation ? 'ns-resize' : 'col-resize';
        },
        immediate: true
      },

    },

    async mounted() {

      this.style = {
        minWidth:        '5px',
        backgroundColor: '#DDD',
        cursor:          'col-resize',
        ...this.style,
      };

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