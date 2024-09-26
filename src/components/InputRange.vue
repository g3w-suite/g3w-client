<!--
  @file
  @since v3.7
-->

<template>
  <baseinput :state="state">
    <input
      slot                = "body"
      @keydown.69.prevent = ""
      @keydown.13.stop    = ""
      @change             = "checkValue"
      @blur               = "checkValue"
      style               = "width:100%; padding-right: 5px;"
      class               = "form-control"
      :tabIndex           = "tabIndex"
      v-disabled          = "!editable"
      :class              = "{'input-error-validation' : notvalid}"
      v-model             = "state.value"
      type                = "number"
      :step               = "step">
  </baseinput>
</template>

<script>
  const Input = require('gui/inputs/input');

  export default {

    /** @since 3.8.6 */
    name: 'input-range',

    mixins: [Input],
    data() {
      const {min, max, Step:step} = this.state.input.options.values[0];
      return {
        min,
        max,
        step
      }
    },
    methods: {
      checkValue() {
        // check if the value of input is empty
        const isEmpty = null === this.state.value || _.isEmpty(`${this.state.value}`.trim());

        // in case not required check if value is empty and set the default value
        if (isEmpty && !this.state.validate.required) {
          this.state.value = this.state.input.options.values[0].default;
        }

        // if state required initial value is false
        this.state.validate.valid = !this.state.validate.required;

        // if is not empty check validity from validator
        if (!isEmpty) {
          this.state.validate.valid = this.service.getValidator().validate(this.state.value);
        }

        this.change();
      }
    }
  };
</script>