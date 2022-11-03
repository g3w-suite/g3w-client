import ApplicationState  from 'core/applicationstate';
import BaseInputComponent from 'components/InputBase.vue'

const { baseInputMixin: BaseInputMixin } = require('gui/vue/vue.mixins');

const InputServices = {
  'text': require('./service'),
  'textarea': require('./service'),
  'integer': require('./integer/service'),
  'string':require('./service'),
  'float': require('./float/service'),
  'radio': require('./radio/service'),
  'check': require('./checkbox/service'),
  'range': require('./range/service'),
  'datetimepicker': require('./datetimepicker/service'),
  'unique': require('./unique/service'),
  'select': require('./select/service'),
  'media': require('./media/service'),
  'select_autocomplete': require('./select/service'),
  'picklayer': require('./service'),
  'color': require('./service'),
  'slider': require('./sliderrange/service'),
  'lonlat': require('./lonlat/service')
};

const Input = {
  props: ['state'],
  mixins: [BaseInputMixin],
  components: {
    'baseinput': BaseInputComponent
  },
  watch: {
    'notvalid'(notvalid){
      notvalid && this.service.setErrorMessage(this.state)
    },
    'state.value'(){
      this.state.input.options.default_expression && this.change();
    }
  },
  created() {
    this.service = new InputServices[this.state.input.type]({
      state: this.state,
    });
    this.$watch(() => ApplicationState.lng, () => this.service.setErrorMessage(this.state));
    this.state.editable && this.state.validate.required && this.service.validate();
    this.$emit('addinput', this.state);
    /**
     * in case of input value is fill with default value option we need to emit changeinput event
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
    this.state.value_from_default_value && this.$emit('changeinput', this.state);
  },
  destroyed(){
    // emit remove input to form (in case for example tab visibility condition)
    this.$emit('removeinput', this.state);
  }
};

module.exports = Input;
