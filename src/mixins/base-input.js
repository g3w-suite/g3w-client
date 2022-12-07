/**
 * ORIGINAL SOURCE: src/app/gui/vue/vue.mixins.js@v3.6
 */
export default {
  computed: {
    notvalid() {
      return this.state.validate.valid === false;
    },
    editable() {
      return this.state.editable;
    },
    showhelpicon(){
      return this.state.help && this.state.help.message.trim();
    },
    disabled(){
      return !this.editable || this.loadingState === 'loading' || this.loadingState === 'error';
    },
    loadingState() {
      return this.state.input.options.loading ? this.state.input.options.loading.state : null;
    }
  },
  methods: {
    showHideHelp(){
      this.state.help.visible = !this.state.help.visible
    },
    // used to text input to listen mobile changes
    mobileChange(event){
      this.state.value = event.target.value;
      this.change();
    },
    // called when input value change
    change() {
      this.service.setEmpty();
      this.service.setUpdate();
      // validate input if is required or need to be unique
      if (this.state.validate.required || this.state.validate.unique) this.service.validate();
      // emit change input
      this.$emit('changeinput', this.state);
    },
    isVisible() {}
  }
};