<!--
  @file
  @since v3.7
-->

<template>
  <baseinput :state="state">
      <input
        slot="body"
        @keydown.69.prevent=""
        @keydown.13.stop=""
        @change="checkValue"
        @blur="checkValue"
        style="width:100%; padding-right: 5px;"
        class="form-control"
        :tabIndex="tabIndex"
        v-disabled="!editable"
        :class="{'input-error-validation' : notvalid}"
        v-model="state.value"
        type="number"
        :step="step">
  </baseinput>
</template>

<script>
const Input = require('gui/inputs/input');

export default {
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
      // set initial valid to true
      let valid = true;
      // check if value of input is empty
      const isEmpty = _.isEmpty(_.trim(this.state.value));
      // in case of required input check if is not empty and check validity from validator
      if (this.state.validate.required) {
        valid =  !isEmpty && this.service.getValidator().validate(this.state.value);
      } else {
        //in case not required check if value is empty
        if (isEmpty) {
          //set default value
          this.state.value = this.state.input.options.values[0].default;
        } else {
          // check validity from validator
          valid = this.service.getValidator().validate(this.state.value);
        }
      }
      this.state.validate.valid = valid;
      this.change();
    }
  }
};
</script>