/**
 * @file
 * @since v3.7
 */

export default {
  computed: {
    tabIndex() {
      return this.editable ? 0 : -1;
    },
    notvalid() {
      return false === this.state.validate.valid;
    },
    editable() {
      return this.state.editable;
    },
    showhelpicon() {
      return this.state.help && this.state.help.message.trim();
    },
    disabled() {
      return !this.editable || ['loading', 'error'].includes(this.loadingState);
    },
    loadingState() {
      return this.state.input.options.loading ? this.state.input.options.loading.state : null;
    }
  },
  methods: {
    /**
     * @since v3.9.1
     * @param bool
     */
    setLoading(bool) {
      this.state.input.options.loading.state = bool ? 'loading' : 'ready';
    },
    showHideHelp() {
      this.state.help.visible = !this.state.help.visible
    },
    // used to text input to listen to mobile changes
    mobileChange(event) {
      this.state.value = event.target.value;
      this.change();
    },
    // called when input value change
    change() {
      this.service.setEmpty();
      this.service.setUpdate();
      // validate input if is required or need to be unique
      if (this.state.validate.required || this.state.validate.unique) {
        this.service.validate();
      }
      // emit change input
      this.$emit('changeinput', this.state);
    },
    isVisible() {}
  }
};