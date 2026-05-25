<!--
  @file
  @since v3.7
-->

<template>
  <div
    class   = "usermessage-tool"
    :id     = "id"
    popover = "manual"
  >
    <div
      class = "usermessage-tool-header"
    >
      <i
        class  = "usermessage-tool-icon"
        :class = "$fa(iconClass || 'tool')">
      </i>
      <div class = "usermessage-tool-title">
        <slot name = "header">
          <h4
            v-if = "title"
            v-t  = "title">
          </h4>
          <h4 v-else> TOOL</h4>
          <h5
            v-if  = "subtitle"
            class = "usermessage-tool-subtitle"
            v-t   = "subtitle">
          </h5>
        </slot>
      </div>
      <div class = "usermessage-tool-right">
        <button
          v-if           = "closable"
          title          = "close"
          type           = "button"
          @click         = "closeUserMessage"
          style          = "border: none;background: none;"
          data-placement = "right"
        >
          <i aria-hidden = "true" class = "usermessage-tool-right-item fas fa-times"></i>
        </button>
      </div>
    </div>
    <slot name = "body">
      <div
        v-if  = "textMessage"
        class = "usermessage-tool-message"
      >{{ message }}</div>
      <div
        v-else
        class = "usermessage-tool-message"
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

      const rect = el.getBoundingClientRect();
      if (!el.style.top)  el.style.top  = rect.top + "px";
      if (!el.style.left) el.style.left = rect.left + "px";

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

      el.style.top  = (parseFloat(el.style.top)  - y2) + "px";
      el.style.left = (parseFloat(el.style.left) - x2) + "px";
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
    },

    beforeDestroy() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
    }
  }
</script>

<style>
.usermessage-tool                       { color: #FFF; line-height: normal; padding: 3px; min-width: 250px; border: unset; inset: unset; margin: unset; background-color: #FFF; color: #222d32; cursor: move; border: thin solid #ccc; width: 325px;  margin-left: calc(var(--sidebar-left) + 40px) !important; }
.usermessage-tool-header                { display: flex; align-items: baseline; justify-content: space-between; width: 100%; border-bottom: 2px solid #eee; }
.usermessage-tool-icon                  { padding: 10px 0 0 5px; font-weight: bold; font-size: 1.3em; }
.usermessage-tool-title,
.usermessage-tool-title h4              { font-weight: bold; text-align: center; }
.usermessage-tool-subtitle              { font-weight: bold; margin: 5px; }
.usermessage-tool-right                 { padding: 5px; }
.usermessage-tool-right-item            { font-weight: bold !important; font-size: 1.2em; cursor: pointer; }
.usermessage-tool-message               { width: 100%; padding: 10px; max-height: 100px; font-size: 1.1em; align-self: flex-start; overflow-y: auto; }
.usermessage-tool:not([style*="left"])  { transition: margin-left .3s ease-in-out; }
body.sidebar-collapse .usermessage-tool { margin-left: calc(var(--sidebar-left) + 5px) !important; }
:root .usermessage-tool[style*="left"]  { margin-left: unset !important; }
@supports (position-area: top left) {
  .usermessage-tool {
    top: anchor(--g3w-map top);
    left: anchor(--g3w-map left);
  }
}
</style>