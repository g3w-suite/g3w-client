import ApplicationState from 'core/applicationstate';
import InputServices from './services';
import { BaseInput, BaseInputMixin } from './baseinput/baseinput';

const Input = {
  props: ['state'],
  mixins: [BaseInputMixin],
  components: {
    baseinput: BaseInput,
  },
  watch: {
    notvalid(newValid) {
      if (newValid) this.service.setErrorMessage(this.state);
    },
  },
  created() {
    this.service = new InputServices[this.state.input.type]({
      state: this.state,
    });
    this.$watch(() => ApplicationState.lng, () => this.service.setErrorMessage(this.state));
    this.state.editable && this.state.validate.required && this.service.validate();
    this.$emit('addinput', this.state);
  },
};

export default Input;
