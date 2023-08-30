<!--
  @file
  @since v3.7
-->

<template>
  <baseinput :state="state">
    <template v-slot:body="{ editable, notvalid, tabIndex, change, mobileChange }">
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
  </baseinput>
</template>

<script>

export default {

  /** @since 3.8.6 */
  name: "input-text",

  props: {
    state: {
      type: Object,
      required: true,
    }
  },

};
</script>