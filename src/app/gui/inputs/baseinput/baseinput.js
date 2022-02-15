const BaseInputMixin = {
  computed: {
    notvalid() {
      return this.state.validate.valid === false;
    },
    editable() {
      return this.state.editable;
    }
  },
  methods: {
    showHideHelp(){
      this.state.help.visible = !this.state.help.visible
    },
    // called when input value change
    change() {
      this.service.setEmpty();
      // validate input
      this.state.validate.required && this.service.validate();
      // emit change input
      this.$emit('changeinput', this.state);
    },
    isVisible() {}
  }
};

const BaseInput = {
  props: ['state'],
  template: require('./baseinput.html'),
  ...BaseInputMixin
};

module.exports = {
  BaseInput,
  BaseInputMixin
};
