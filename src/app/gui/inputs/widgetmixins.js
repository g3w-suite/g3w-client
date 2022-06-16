const WidgetMixins = {
  data() {
    return {
      changed: false,
    };
  },
  methods: {
    widgetChanged() {
      this.changed = true;
      this.change();
    },
    stateValueChanged(value) {
      console.log('need to be implemented by widget'); // method to overwrite
    },
  },
  watch: {
    'state.value': function (value) {
      this.changed ? this.changed = false : this.stateValueChanged(value);
    },
  },
};

export default WidgetMixins;
