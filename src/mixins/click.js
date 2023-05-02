/**
 * @file
 * @since v3.8
 */

export default {
  
  created() {
    /**
     * Store `click` and `doubleclick` events on a single vue element.
     *
     * @see https://stackoverflow.com/q/41303982
     */
    this.CLICK_EVENT = {
      count: 0,                                   // count click events
      timeoutID: null                             // timeoutID return by setTimeout Function
    };
  },
  
  methods: {

    /**
     * @param callbacks:<Object> contain as key number of click and as value method to call
     * @param context
     */
    handleClick(callbacks= {}, context) {
      this.CLICK_EVENT.count += 1;                   // increment click count
      if (!this.CLICK_EVENT.timeoutID) {             // skip and wait for timeout in order to detect double click
        this.CLICK_EVENT.timeoutID = setTimeout(() => {
          if (undefined !== callbacks[this.CLICK_EVENT.count]) {
            callbacks[this.CLICK_EVENT.count].call(context);
          }
          this.__resetClickMixin();
        }, 300);
      }
    },

    __resetClickMixin() {
      this.CLICK_EVENT.count = 0;
      this.CLICK_EVENT.timeoutID = null;
    },

    __clearClickMixin() {
      this.__resetClickMixin();
      this.CLICK_EVENT = null;
    }

  },

  beforeDestroy(){
    this.__clearClickMixin();
  }

};