import Input  from 'gui/inputs/input';
import template from './range.html'

const RangeInput = Vue.extend({
  mixins: [Input],
  template,
  data() {
    const options = this.state.input.options.values[0];
    const min = 1*options.min;
    const max = 1*options.max;
    const step = 1*options.Step;
    return {
      max,
      min,
      step: step
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

export default  RangeInput;
