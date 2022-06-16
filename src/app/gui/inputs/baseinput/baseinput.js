import template from './baseinput.html';

export const BaseInputMixin = {
  computed: {
    notvalid() {
      return this.state.validate.valid === false;
    },
    editable() {
      return this.state.editable;
    },
    showhelpicon() {
      return this.state.help && this.state.help.message.trim();
    },
  },
  methods: {
    showHideHelp() {
      this.state.help.visible = !this.state.help.visible;
    },
    // used to text input to listen mobile changes
    mobileChange(event) {
      this.state.value = event.target.value;
      this.change();
    },
    // called when input value change
    change() {
      this.service.setEmpty();
      // validate input
      this.state.validate.required && this.service.validate();
      // emit change input
      this.$emit('changeinput', this.state);
    },
    isVisible() {},
  },
};

export const BaseInput = {
  props: ['state'],
  template,
  ...BaseInputMixin,
};

export default {
  BaseInput,
  BaseInputMixin,
};
