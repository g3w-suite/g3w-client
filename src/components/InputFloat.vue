<!--
  @file
  @since v3.7
-->

<template>
  <baseinput :state="state">
    <input
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
      :step        = "state.step || 1"
      :placeholder = "state.default"
    >
  </baseinput>
</template>

<script>
import { g3wInputMixin } from 'mixins';

export default {

  /** @since 3.8.6 */
  name: 'input-float',

  mixins: [ g3wInputMixin ],

};
</script>