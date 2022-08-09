import BaseInputComponent from 'components/InputBase.vue'
const {baseInputMixin:BaseInputMixin} = require('gui/vue/vue.mixins');

module.exports = {
  BaseInput: BaseInputComponent,

  /**
   * DEPRECATED: will be removed after v3.4 (use "gui/vue/vue.mixins" instead)
   */
  BaseInputMixin
};
