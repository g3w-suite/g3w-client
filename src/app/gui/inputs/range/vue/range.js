const Input = require('gui/inputs/input');

const RangeInput = Vue.extend({
  mixins: [Input],
  template: require('./range.html'),
  data() {
    const options = this.state.input.options.values[0];
    const min = 1 * options.min;
    const max = 1 * options.max;
    const step = 1 * options.Step;
    return {
      max,
      min,
      step,
    };
  },
  methods: {
    checkValue() {
      const valid = this.state.validate.required || !_.isEmpty(_.trim(this.state.value)) ? this.service.getValidator().validate(this.state.value) : true;
      this.state.validate.valid = valid;
      this.change();
    },
  },
});

module.exports = RangeInput;
