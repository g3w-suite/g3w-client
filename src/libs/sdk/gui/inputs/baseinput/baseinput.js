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
    // called when input value change
    change: function() {
      this.service.setEmpty();
      // validate input
      this.state.validate.required && this.service.validate();
      // emit change input
      this.$emit('changeinput', this.state);
    },
    isVisible: function() {}
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
