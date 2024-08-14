<!--
  @file
  @since v3.7
-->

<template>
  <div
    class  = "usermessage-content"
    :id    = "id"
    :style = "style"
    :class = "{'mobile': addClassMobile(), ['usermessage-' + type]: true}"
    ref    = "user_message"
  >
    <div
      v-if  = "showheader"
      class = "usermessage-header-content"
    >
      <i
        class  = "usermessage-header-icontype"
        :class = "g3wtemplate.getFontClass(iconClass || type)">
      </i>
      <div class = "usermessage-header-title">
        <slot name = "header">
          <h4
            v-if = "title"
            v-t  = "title">
          </h4>
          <h4  v-else> {{ type.toUpperCase() }}</h4>
          <h5
            v-if  = "subtitle"
            class = "usermessage-header-subtitle"
            v-t   = "subtitle">
          </h5>
        </slot>
      </div>
      <div class = "usermessage-header-right">
        <div
          v-if   = "!autoclose && closable"
          @click = "closeUserMessage"
        >
          <i class = "usermessage-header-right-item" :class = "g3wtemplate.getFontClass('close')"></i>
        </div>
      </div>
    </div>
    <slot name = "body">
      <div
        v-if  = "textMessage"
        class = "usermessage-message"
      >{{ message }}</div>
      <div
        v-else
        class = "usermessage-message"
        v-t   = "message"
      ></div>
    </slot>
    <slot name = "footer"></slot>
  </div>
</template>

<script>
  import GUI from 'services/gui';

  /**
   * @see https://www.w3schools.com/howto/howto_js_draggable.asp 
   */
  function dragElement(el) {
    let x2 = 0, y2 = 0, x1 = 0, y1 = 0;
    el.addEventListener('mousedown', function(e) {
      // skip dragging on form elements
      if (['.select2-container', 'button', 'select', 'input', 'textarea'].some(i => e.target.closest(i))) {
        return;
      }
      e.preventDefault();
      x1 = e.clientX;
      y1 = e.clientY;
      document.addEventListener('mouseup', mouseUp);
      document.addEventListener('mousemove', mouseMove);
    });
    function mouseUp() {
      document.removeEventListener('mouseup', mouseUp);
      document.removeEventListener('mousemove', mouseMove);
    }
    function mouseMove(e) {
      e.preventDefault();
      x2 = x1 - e.clientX;
      y2 = y1 - e.clientY;
      x1 = e.clientX;
      y1 = e.clientY;
      if (el.style.marginLeft) { x2 -= parseInt(el.style.marginLeft); el.style.marginLeft = null; }
      if (el.style.marginTop)  { y2 -= parseInt(el.style.marginTop);  el.style.marginTop  = null; }
      el.style.top  = (el.offsetTop - y2)    + "px";
      el.style.left = (el.offsetLeft - x2) + "px";
    }
  }

  export default {
    name: "usermessage",
    props: {
      id: {},
      type: {
        type:    String,
        default: "info" // info, warning, alert, tool
      },
      title: {
        type:    String,
        default: null,
      },
      subtitle: {
        type:    String,
        default: null,
      },
      position: {
        type:    String,
        default: "top"
      },
      size: {
        type:    String, // values [small, medium,fullpage]
        default: "fullpage"
      },
      message: {
        type:    String,
        default: ''
      },
      textMessage: {
        type:    Boolean,
        default: false
      },
      autoclose: {
        type:    Boolean,
        default: false
      },
      draggable: {
        type:    Boolean,
        default: false
      },
      duration: {
        type:    Number,
        default: 2000
      },
      closable: {
        type:    Boolean,
        default: true
      },
      //@since 3.11.0
      iconClass: {
        type: String,
        default: null
      }
    },
    computed: {
      showheader() {
        return 'loading'!== this.type ;
      }
    },
    methods: {
      addClassMobile() {
        return this.isMobile() && !GUI.isSidebarVisible();
      },
      closeUserMessage() {
        this.$emit('close-usermessage')
      },
      hideShow() {}
    },
    created() {
      let [where, alignement] = this.position.split('-');
      this.style = {
        ...(
          'center' === where
            ? { top: 0, bottom: 0, maxHeight: '20%' }
            : { [where]: 50 }
        ),
        ...({
          'center': { left: 0, right: 0, margin: 'auto' },
          'right': { right:  0 },
        }[alignement] || {}),
        width: ({
          'small':    '325px',
          'medium':   '50%',
          'fullpage': '100%'
        })[alignement ? 'small' : this.size] || '100%',
        /**
         * Custom styles to handle different types of usermessage
         */...({
          success: { backgroundColor: "#62ac62", color: "#FFF" },
          info:    { backgroundColor: "#44a0bb", color: "#FFF" },
          warning: { backgroundColor: "#f29e1d", color: "#FFF" },
          alert:   { backgroundColor: "#c34943", color: "#FFF" },
          tool:    {
            backgroundColor: "#FFF",
            color:           "#222d32",
            "z-index":       100,
            marginLeft:      "40px",
          },
          loading: {
            backgroundColor: "#FFF",
            color:           "#222d32",
            fontWeight:      "bold",
          },
        })[this.type],
      }
    },
    async mounted() {
      if ('tool' === this.type) {
        dragElement(this.$refs.user_message);
      }
      if (this.autoclose) {
        await this.$nextTick();
        const timeout = setTimeout(() => {
          this.closeUserMessage();
          clearTimeout(timeout)
        }, this.duration)
      }
    }
  }
</script>

<style scoped>
  .usermessage-content {
    color: #FFFFFF;
    z-index: 1000;
    position: absolute;
    line-height: normal;
    padding: 3px;
    min-width: 250px;
    box-shadow: 0 3px 5px rgba(0, 0, 0, 0.3);
    border-radius: 0 0 3px 3px;
  }

  .usermessage-tool {
    cursor: move;
    position: fixed;
  }

  .usermessage-content.mobile {
    padding: 0;
    min-width: 100%;
  }

  .usermessage-header-content {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    width: 100%;
    border-bottom: 2px solid #eeeeee;
  }

  .usermessage-header-icontype {
    padding: 10px 0 0 5px;
    font-weight: bold;
    font-size: 1.3em;
  }

  .usermessage-content.mobile .usermessage-header-icontype {
    padding: 0 0 0 5px;
    font-size: 1.1em;
  }

  .usermessage-header-title, .usermessage-header-title h4 {
    font-weight: bold;
    text-align: center;
  }

  .usermessage-content.mobile  .usermessage-header-title h4 {
    margin: 0;
  }

  .usermessage-header-subtitle {
    font-weight: bold;
    margin: 5px;
  }

  .usermessage-header-right {
    padding: 5px;
  }

  .usermessage-header-right-item {
    font-weight: bold !important;
    font-size: 1.2em;
    cursor: pointer;
  }

  .usermessage-message {
    width: 100%;
    padding: 10px;
    max-height: 100px;
    font-size: 1.1em;
    align-self: flex-start;
    overflow-y: auto;
  }

</style>