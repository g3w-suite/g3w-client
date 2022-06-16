import Input from 'gui/inputs/input';
import template from './float.html';

const FloatInput = Vue.extend({
  mixins: [Input],
  template,
});

export default FloatInput;
