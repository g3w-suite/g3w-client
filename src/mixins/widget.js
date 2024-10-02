/**
 * @file
 * @since v3.7
 */

export default {
  data() {
    return {
      changed: false
    }
  },
  methods: {
    widgetChanged() {
      this.changed = true;
      this.change();
    },
    stateValueChanged(value) {
      console.log('need to be implemented by widget') // method to overwrite
    }
  },
  watch: {
    'state.value'(value) {
      if (this.changed) {
        this.changed = false
      } else {
        this.stateValueChanged(value);
      }
    }
  }
};