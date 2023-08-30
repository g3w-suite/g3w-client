<!--
  @file
  @since v3.7
-->

<template>
  <baseinput :state="state">
    <input
      :placeholder = "state.default"
      @change      = "change"
      @input       = "change"
      class        = "form-control"
      style        = "width: 100%"
      :tabIndex    = "tabIndex"
      v-disabled   = "!editable"
      :class       = "{ 'input-error-validation' : notvalid }"
      v-model      = "state.value"
      slot         = "body"
      type         = "number"
    >
  </baseinput>
</template>

<script>
import { baseInputMixin } from 'mixins';

export default {

  /** @since 3.8.6 */
  name: 'input-integer',

  mixins: [ baseInputMixin ],

};
</script>