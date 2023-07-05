/**
 * @file
 * 
 * ORIGINAL SOURCE: src/gui/inputs/input.js@3.8
 * 
 * @TODO merge into `src/mixins/base-input.js`
 * 
 * @since 3.8.3
 */

import ApplicationState   from 'store/application-state';
import baseInputMixin from 'mixins/base-input';
import BaseInputComponent from 'components/InputBase.vue';

console.log(baseInputMixin, BaseInputComponent);

export default {

  props: ['state'],

  mixins: [ baseInputMixin ],

  components: {
    'baseinput': BaseInputComponent
  },

  watch: {
    'notvalid'(notvalid){
      notvalid && this.service.setErrorMessage(this.state)
    },
    'state.value'(){
      if ("undefined" !== typeof this.state.input.options.default_expression) {
        // need to postpone state.value watch parent that use mixin
        setTimeout(() => this.change());
      }
    }
  },

  created() {
    this.service = new InputsServices[this.state.input.type]({ state: this.state });
    this.$watch(() => ApplicationState.language, () => this.service.setErrorMessage(this.state));
    this.state.editable && this.state.validate.required && this.service.validate();
    this.$emit('addinput', this.state);
    /**
     * When input value has a default value option emit
     * `changeinput` event without check validation.
     * 
     * @example in this case if we start a validation, it
     *          will fail because default value is a string
     *          while input is interger:
     * 
     * ```
     * {
     *  "name": "id",
     *   "type": "integer",
     *   "label": "id",
     *   "editable": false,
     *   "validate": {
     *       "required": true,
     *       "unique": true
     *   },
     *   "pk": true,
     *   "default": "nextval('g3wsuite.zone_id_seq'::regclass)",
     *   "input": {
     *       "type": "text",
     *       "options": {}
     *   }
     * }
     * 
     * ```
     */
   if (this.state.value_from_default_value) {
    this.$emit('changeinput', this.state);
   }
  },

  destroyed() {
    // emit remove input to form (in case for example tab visibility condition)
    this.$emit('removeinput', this.state);
  }

};