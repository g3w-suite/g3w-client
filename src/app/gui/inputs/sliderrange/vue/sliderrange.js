const Input = require('gui/inputs/input');

const RangeInput = Vue.extend({
  mixins: [Input],
  template: require('./sliderrange.html'),
  data() {
    const {min, max, step } = this.state.input.options;
    return {
      max,
      min,
      step
    }
  },
  methods: {
    checkValue() {
      const valid = this.state.validate.required || !_.isEmpty(_.trim(this.state.value)) ? this.service.getValidator().validate(this.state.value) : true;
      this.state.validate.valid = valid;
      this.change();
    }
  }
});

module.exports = RangeInput;
