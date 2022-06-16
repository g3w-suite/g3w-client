import Input from 'gui/inputs/input';
import template from './sliderrange.html';

const RangeInput = Vue.extend({
  mixins: [Input],
  template,
  watch: {
    'state.input.options.min': function () {
      this.service.changeInfoMessage();
    },
    'state.input.options.max': function () {
      this.service.changeInfoMessage();
    },
  },
});

export default RangeInput;
