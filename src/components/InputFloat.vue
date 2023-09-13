<!--
  @file
  @since v3.7
-->

<template>
  <g3w-input :state="state">
    <template #input-body="{ change, tabIndex, editable, notvalid }">
      <input
        @change      = "change"
        @input       = "change"
        :tabIndex    = "tabIndex"
        v-disabled   = "!editable"
        :class       = "{ 'input-error-validation' : notvalid }"
        v-model      = "state.value"
        :step        = "state.step || 1"
        :placeholder = "state.default"
        class        = "form-control"
        style        = "width: 100%"
        type         = "number"
      >
    </template>
  </g3w-input>
</template>

<script>

export default {

  /** @since 3.8.6 */
  name: 'input-float',

  props: {
    state: {
      type: Object,
      required: true,
    }
  }

};
</script>