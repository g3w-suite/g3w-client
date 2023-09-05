<!--
  @file
  @since v3.7
-->

<template>
  <g3w-input :state="state">
    <template #body="{ tabIndex, editable, notvalid }">
      <input
        @keydown.69.prevent = ""
        @keydown.13.stop    = ""
        @change             = "checkValue"
        @blur               = "checkValue"
        style               = "width: 100%; padding-right: 5px;"
        class               = "form-control"
        :tabIndex           = "tabIndex"
        v-disabled          = "!editable"
        :class              = "{ 'input-error-validation' : notvalid }"
        v-model             = "state.value"
        type                = "number"
        :step               = "step"
      >
    </template>
  </g3w-input>
</template>

<script>
export default {

  /** @since 3.8.6 */
  name: 'input-range',

  data() {
    const { min, max, Step:step } = this.state.input.options.values[0];
    return {
      min,
      max,
      step,
    };
  },

  props: {
    state: {
      type: Object,
      required: true,
    },
  },

  methods: {

    checkValue() {
      // check if value of input is empty
      const isEmpty = _.isEmpty(_.trim(this.state.value));

      // in case not required check if value is empty and set default value
      if (isEmpty && !this.state.validate.required) {
        this.state.value = this.state.input.options.values[0].default;
      }

      // if state required initial value is false
      this.state.validate.valid = !this.state.validate.required;

      // if is not empty check validity from validator
      if (!isEmpty) {
        this.state.validate.valid = this.$parent.getService().getValidator().validate(this.state.value);
      }

      this.$parent.change();
    },

  },

};
</script>