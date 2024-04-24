import ApplicationState                     from 'store/application-state';
import BaseInputComponent                   from 'components/InputBase.vue'
import { baseInputMixin as BaseInputMixin } from 'mixins';

const InputServices = require('./services');

const Input = {
  props: ['state'],
  mixins: [BaseInputMixin],
  components: {
    'baseinput': BaseInputComponent
  },
  watch: {
    'notvalid'(notvalid) {
      notvalid && this.service.setErrorMessage()
    },
    'state.value'(){
      if (undefined !== this.state.input.options.default_expression) {
        // need to postpone state.value watch parent that use mixin
        setTimeout(() => this.change());
      }
    }
  },
  created() {
    this.service = new InputServices[this.state.input.type]({
      state: this.state,
    });

    this.$watch(
      () => ApplicationState.language,
      async () => {
        if (this.state.visible) {
          this.state.visible = false;
          this.service.setErrorMessage();
          await this.$nextTick();
          this.state.visible = true;
        }
    });

    if (this.state.editable && this.state.validate.required) {
      this.service.validate();
    }

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
