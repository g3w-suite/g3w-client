<!--
  @file
  @since v3.7
-->

<template>
  <baseinput :state = "state">
    <input
      slot         = "body"
      @change      = "change"
      @input       = "change"
      class        = "form-control"
      style        = "width:100%"
      :tabIndex    = "tabIndex"
      v-disabled   = "!editable"
      :class       = "{'input-error-validation' : notvalid}"
      v-model      = "state.value"
      type         = "number"
      :step        = "state.step || 1"
      :placeholder = "state.default"
    >
  </baseinput>
</template>

<script>
import Input from 'components/g3w-input';

  export default {

    /** @since 3.8.6 */
    name: 'input-integer',

    mixins: [Input],
  };
</script>