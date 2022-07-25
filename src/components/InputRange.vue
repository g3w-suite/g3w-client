<!-- ORIGINAL SOURCE: -->
<!-- gui/inputs/range/vue/range.html@v3.4 -->
<!-- gui/inputs/range/vue/range.js@v3.4 -->

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
    const options = this.state.input.options.values[0];
    const min = 1*options.min;
    const max = 1*options.max;
    const step = 1*options.Step;
    return {
      max,
      min,
      step: step
    }
  },
  methods: {
    checkValue() {
      const valid = this.state.validate.required || !_.isEmpty(_.trim(this.state.value)) ? this.service.getValidator().validate(this.state.value) : true;
      this.state.validate.valid = valid;
      this.change();
    }
  }
};
</script>