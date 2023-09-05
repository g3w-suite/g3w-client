<!--
  @file
  @since v3.7
-->

<template>
  <g3w-input :state="state">
    <template #body="{ mobileChange, change, tabIndex, editable, notvalid }">
      <input
        :placeholder = "state.default"
        @keyup       = "isMobile() ? mobileChange($event) : change()"
        :tabIndex    = "tabIndex"
        v-disabled   = "!editable"
        :field       = "state.name"
        class        = "form-control"
        v-model      = "state.value"
        :class       = "{ 'input-error-validation' : notvalid }"
        :id          = "state.name"
      >
    </template>
  </g3w-input>
</template>

<script>

export default {

  /** @since 3.8.6 */
  name: "input-text",

  props: {
    state: {
      type: Object,
      required: true,
    },
  },

};
</script>