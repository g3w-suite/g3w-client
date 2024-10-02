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
    this.__CLICK_EVENT = {
      count:     0,                                   // count click events
      timeoutID: null                             // timeoutID return by setTimeout Function
    };
  },
  
  methods: {

    /**
     * @param {{ '1': () => {}, '2': () => {}}} callbacks hashmap of click event handlers ('1' = click, '2' = double click)
     * @param context
     */
    handleClick(callbacks = {}, context) {
      if (!this.__CLICK_EVENT) {
        console.warn('click mixin not initialized on context:', context);
        return;
      }
      this.__CLICK_EVENT.count += 1;                   // increment click count
      if (!this.__CLICK_EVENT.timeoutID) {             // skip and wait for timeout in order to detect double click
        this.__CLICK_EVENT.timeoutID = setTimeout(() => {
          if (undefined !== callbacks[this.__CLICK_EVENT.count]) {
            callbacks[this.__CLICK_EVENT.count].call(context);
          }
          this.__resetClickMixin();
        }, 300);
      }
    },

    __resetClickMixin() {
      this.__CLICK_EVENT.count     = 0;
      this.__CLICK_EVENT.timeoutID = null;
    },

    __clearClickMixin() {
      this.__resetClickMixin();
      this.__CLICK_EVENT = null;
    }

  },

  beforeDestroy() {
    this.__clearClickMixin();
  }

};