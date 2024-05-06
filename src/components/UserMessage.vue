<!--
  @file
  @since v3.7
-->

<template>
  <div
    class  = "usermessage-content"
    :id    = "id"
    :style = "style"
    :class = "{'mobile': addClassMobile()}"
  >
    <div
      v-if="showheader"
      class="usermessage-header-content"
    >
      <i
        class="usermessage-header-icontype"
        :class="g3wtemplate.getFontClass(type)">
      </i>
      <div class="usermessage-header-title">
        <slot name="header">
          <h4
            v-if = "title"
            v-t  = "title">
          </h4>
          <h4  v-else> {{ type.toUpperCase() }}</h4>
          <h5
            v-if="subtitle"
            class="usermessage-header-subtitle"
            v-t="subtitle">
          </h5>
        </slot>
      </div>
      <div class="usermessage-header-right">
        <div
          v-if   = "!autoclose && closable"
          @click = "closeUserMessage"
        >
          <i class="usermessage-header-right-item" :class="g3wtemplate.getFontClass('close')"></i>
        </div>
      </div>
    </div>
    <slot name="body">
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
    <slot name="footer"></slot>
  </div>
</template>

<script>
  import { ZINDEXES } from 'app/constant';
  import GUI          from 'services/gui';

  const COLORS = {
    success: {
      backgroundColor: "#62ac62",
      color:           "#FFFFFF"
    },
    info: {
      backgroundColor: "#44a0bb",
      color:           "#FFFFFF"
    },
    warning: {
      backgroundColor: "#f29e1d",
      color:           "#FFFFFF"
    },
    alert: {
      backgroundColor: "#c34943",
      color:           "#FFFFFF"
    },
    tool: {
      backgroundColor: "#FFFFFF",
      color:           "#222d32"
    },
    loading: {
      backgroundColor: "#FFFFFF",
      color:           "#222d32",
      fontWeight:      "bold"
    },
  };
  /**
   * Add custom style to handle a different type of usermessage
   * @type {{alert: {}, success: {}, warning: {}, loading: {}, tool: {"z-index": string}, info: {}}}
   */
  const STYLES = {
    success: {},
    info:    {},
    warning: {},
    alert:   {},
    tool:    {
      "z-index": ZINDEXES.usermessage.tool,
      left: "40px"
    },
    loading: {},
  };

  export default {
    name: "usermessage",
    props: {
      id:{},
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
      }
    },
    computed:{
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
      let width = '100%';
      switch (this.size) {
        case 'small':
          width = '25%';
          break;
        case 'medium':
          width = '50%';
          break;
        case 'fullpage':
        default:
          width = '100%';
      }
      if ('center' === where)
        where = {
          top:       0,
          bottom:    0,
          maxHeight: '20%'
        };
      else {
        where = {
          [where]: 50
        }
      }
      const position = {
        ...where,
        width
      };
      if (alignement) {
        position.width = '25%';
        switch (alignement) {
          case 'center':
            position.left   = '0';
            position.right  = '0';
            position.margin = 'auto';
            break;
          case 'right':
            position.right  = 0;
            break;
        }
      }
      this.style = {
        ...COLORS[this.type],
        ...position,
        ...STYLES[this.type]
      }
    },
    async mounted() {
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
    -moz-box-shadow: 0 3px 5px rgba(0, 0, 0, 0.3);
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
    padding: 0 0 3px 10px;
    max-height: 100px;
    font-size: 1.1em;
    align-self: flex-start;
    overflow-y: auto;
  }

</style>