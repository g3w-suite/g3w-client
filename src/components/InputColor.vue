<!--
  @file
  @since v3.7
-->

<template>
  <baseinput :state="state">
    <input
      :placeholder = "state.default"
      type         = "color"
      slot         = "body"
      @change      = "change"
      :tabIndex    = "tabIndex"
      v-disabled   = "!editable"
      :field       = "state.name"
      class        = "form-control"
      style        = "cursor: pointer"
      v-model      = "state.value"
      :class       = "{ 'input-error-validation' : notvalid }"
      :id          = "state.name"
    >
  </baseinput>
</template>

<script>
import { g3wInputMixin } from 'mixins';

export default {
  mixins: [ g3wInputMixin ]
};
</script>