import Input from 'gui/inputs/input';
import template from './text.html';

const TextInput = Vue.extend({
  template,
  mixins: [Input],
});

export default TextInput;
