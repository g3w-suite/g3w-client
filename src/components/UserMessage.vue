<!--
  @file
  @since v3.7
-->

<template>
  <div
    class   = "usermessage-content"
    :id     = "id"
    :style  = "style"
    :class  = "{ ['usermessage-' + type]: true }"
    popover = "manual"
  >
    <div
      v-if  = "showheader"
      class = "usermessage-header-content"
    >
      <i
        class  = "usermessage-header-icontype"
        :class = "$fa(iconClass || type)">
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
          v-if             = "closable"
          v-t-tooltip:left = "'close'"
          @click           = "closeUserMessage"
        >
          <i class = "usermessage-header-right-item" :class = "$fa('close')"></i>
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

  /**
   * @see https://www.w3schools.com/howto/howto_js_draggable.asp 
   */
  function _makeDraggable(el) {
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
      el.style.top  = (el.offsetTop - y2)  + "px";
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
      size: {
        type:    String, // values [small, fullpage]
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
      duration: {
        type:    Number,
        default: 3000
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
          width:      'small' === this.size ? '325px' : (`${g3wsdk.core.ApplicationState.map.sizes.width}px`),
          marginLeft: 'small' === this.size ? (document.body.classList.contains('sidebar-collapse') ? '5px' : '40px') : null,
        }
      }
    },
    computed: {
      showheader() {
        return 'loading'!== this.type ;
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
      if ('tool' === this.type) {
        _makeDraggable(this.$el);
      }
      if (this.size === 'fullpage') {
        this.uw = this.$watch(
          ()    => g3wsdk.core.ApplicationState.map.sizes.width, 
          width => this.style.width = 'fullpage' === this.size ? `${width}px`: this.style.width
        );
      }
      this.observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if ("class" === mutation.attributeName) {
            this.style.marginLeft = 'small' === this.size ? (mutation.target.classList.contains('sidebar-collapse') ? '5px' : '40px') : null;
          }
        });
      });
      this.observer.observe(document.body, { attributes: true });
      if (this.autoclose) {
        await this.$nextTick();
        const timer = setTimeout(() => {
          this.closeUserMessage();
          clearTimeout(timer)
        }, this.duration)
      }
    },
    beforeDestroy() {
      if (this.uw) {
        this.uw();
        this.uw = null;
      }
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
    }
  }
</script>

<style>
  #g3w-view-map {
    anchor-name: --g3w-view-map; 
  }
</style>

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

  .usermessage-success   { background-color: #62ac62; }
  .usermessage-info      { background-color: #44a0bb; }
  .usermessage-warning   { background-color: #f29e1d; }
  .usermessage-alert     { background-color: #c34943; }
  .usermessage-tool      { background-color: #FFF; color: #222d32; cursor: move; border: thin solid #ccc; }
  .usermessage-loading   { background-color: #FFF; color: #222d32;  font-weight: bold; }

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