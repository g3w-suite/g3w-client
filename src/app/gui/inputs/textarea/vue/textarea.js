const Input = require('gui/inputs/input');

const TextAreaInput = Vue.extend({
  mixins: [Input],
  template: require('./textarea.html'),
});

module.exports = TextAreaInput;
