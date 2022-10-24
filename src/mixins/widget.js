/**
 * ORIGINAL SOURCE: src/app/gui/vue/vue.mixins.js@v3.6
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
      this.changed ? this.changed = false : this.stateValueChanged(value);
    }
  }
};