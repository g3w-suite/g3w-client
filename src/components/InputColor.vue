<!--
  @file
  @since v3.7
-->

<template>
  <baseinput :state = "state">
    <input
      slot         = "body"
      :placeholder = "state.default"
      type         = "color"
      @change      = "change"
      :tabIndex    = "tabIndex"
      v-disabled   = "!editable"
      :field       = "state.name"
      class        = "form-control"
      style        = "cursor: pointer"
      v-model      = "state.value"
      :class       = "{'input-error-validation' : notvalid}"
      :id          = "state.name">
  </baseinput>
</template>

<script>
const Input = require('gui/inputs/input');

export default {

  /** @since 3.8.6 */
  name: 'input-color',

  mixins: [Input]
};
</script>