const Input = require('gui/inputs/input');

const TextInput = Vue.extend({
  template: require('./color.html'),
  mixins: [Input]
});

module.exports = TextInput;
