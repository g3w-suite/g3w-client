<!--
  @file
  @since v3.7
-->

<template>
  <div
    class   = "usermessage-content usermessage-tool"
    :id     = "id"
    :style  = "style"
    popover = "manual"
  >
    <div
      class = "usermessage-header-content"
    >
      <i
        class  = "usermessage-header-icontype"
        :class = "$fa(iconClass || 'tool')">
      </i>
      <div class = "usermessage-header-title">
        <slot name = "header">
          <h4
            v-if = "title"
            v-t  = "title">
          </h4>
          <h4 v-else> TOOL</h4>
          <h5
            v-if  = "subtitle"
            class = "usermessage-header-subtitle"
            v-t   = "subtitle">
          </h5>
        </slot>
      </div>
      <div class = "usermessage-header-right">
        <button
          v-if           = "closable"
          title          = "close"
          type           = "button"
          @click         = "closeUserMessage"
          style          = "border: none;background: none;"
          data-placement = "right"
        >
          <i aria-hidden = "true" class = "usermessage-header-right-item fas fa-times"></i>
        </button>
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

  /**
   * @see https://www.w3schools.com/howto/howto_js_draggable.asp 
   */
  function _makeDraggable(el) {
    let x2 = 0, y2 = 0, x1 = 0, y1 = 0;
    el.addEventListener('mousedown', e => {
      // skip dragging on form elements
      if (['.select2-container', 'button', 'select', 'input', 'textarea', 'x-select'].some(i => e.target.closest(i))) {
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
      el.style.top  = (el.offsetTop - y2)  + "px";
      el.style.left = (el.offsetLeft - x2) + "px";
    }
  }

  export default {
    name: "usermessage",
    props: {
      id: {},
      title: {
        type:    String,
        default: null,
      },
      subtitle: {
        type:    String,
        default: null,
      },
      message: {
        type:    String,
        default: ''
      },
      textMessage: {
        type:    Boolean,
        default: false
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
    data() {
      return {
        style: {
          top:        'position-area' in document.body.style ? 'anchor(--g3w-view-map top)' : null,
          left:       'position-area' in document.body.style ? 'anchor(--g3w-view-map left)' : null,
          width:      '325px',
          marginLeft: (document.body.classList.contains('sidebar-collapse') ? '5px' : '40px'),
        }
      }
    },
    methods: {
      closeUserMessage() {
        if (this.$el.popover) {
          this.$el.hidePopover();
        }
        this.$emit('close-usermessage');
      },
    },
    
    async mounted() {
      this.$el.showPopover();
      _makeDraggable(this.$el);
      this.observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if ("class" === mutation.attributeName) {
            this.style.marginLeft = 'small' === this.size ? (mutation.target.classList.contains('sidebar-collapse') ? '5px' : '40px') : null;
          }
        });
      });
      this.observer.observe(document.body, { attributes: true });
    },
    beforeDestroy() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
    }
  }
</script>
<style scoped>

  .usermessage-content {
    color: #FFF;
    line-height: normal;
    padding: 3px;
    min-width: 250px;
    border: unset;
    inset: unset;
    margin: unset;
  }

  .usermessage-tool {
    background-color: #FFF;
    color: #222d32;
    cursor: move;
    border: thin solid #ccc;
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

  .usermessage-header-title, .usermessage-header-title h4 {
    font-weight: bold;
    text-align: center;
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