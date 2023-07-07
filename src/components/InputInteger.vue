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
import { g3wInputMixin } from 'mixins';

export default {
  mixins: [ g3wInputMixin ],
};
</script>