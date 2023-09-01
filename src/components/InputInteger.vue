<!--
  @file
  @since v3.7
-->

<template>
  <g3w-input :state="state">
    <template #body="{ change, tabIndex, editable, notvalid }">
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
        type         = "number"
      >
    </template>
  </g3w-input>
</template>

<script>

export default {

  /** @since 3.8.6 */
  name: 'input-integer',

  props: {
    state: {
      type: Object,
      required: true,
    }
  }

};
</script>