import ApplicationState  from 'core/applicationstate';
const InputServices = require('./services');
const {BaseInput, BaseInputMixin}  = require('./baseinput/baseinput');
const Input = {
  props: ['state'],
  mixins: [BaseInputMixin],
  components: {
    'baseinput': BaseInput
  },
  watch: {
    'notvalid'(notvalid){
      notvalid && this.service.setErrorMessage(this.state)
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
  mounted() {
    /**
     * in case of input value is fill with default value option we nee to emit changeinput event
     * without check validation. Example:
     * {
        "name": "id",
        "type": "integer",
        "label": "id",
        "editable": false,
        "validate": {
            "required": true,
            "unique": true
        },
        "pk": true,
        "default": "nextval('g3wsuite.zone_id_seq'::regclass)",
        "input": {
            "type": "text",
            "options": {}
        }
      }
     in this case if we start a validation, it fail because default value is a string while input is interger
     */
    this.$emit('changeinput', this.state);
  },
  destroyed(){
    // emit remove input to form (in case for example tab visibility condition)
    this.$emit('removeinput', this.state);
  }
};

module.exports = Input;
