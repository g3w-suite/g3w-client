const {baseInputMixin:BaseInputMixin} = require('gui/vue/vue.mixins');

const BaseInput = {
  props: ['state'],
  template: require('./baseinput.html'),
  ...BaseInputMixin
};

module.exports = {
  BaseInput,

  /**
   * DEPRECATED: will be removed after v3.4 (use "gui/vue/vue.mixins" instead)
   */
  BaseInputMixin
};
