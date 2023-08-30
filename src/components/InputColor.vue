<!--
  @file
  @since v3.7
-->

<template>
  <g3w-input :state="state">
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
  </g3w-input>
</template>

<script>
import { baseInputMixin } from 'mixins';

export default {

  /** @since 3.8.6 */
  name: 'input-color',

  mixins: [ baseInputMixin ],

};
</script>