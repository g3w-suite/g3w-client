<!--
  @file
  @since v3.7
-->

<template>
  <g3w-input :state="state">
    <template #input-body="{ change, tabIndex, editable, notvalid }">
      <textarea
        @keydown.stop = ""
        :placeholder  = "state.default"
        @input        = "change"
        @change       = "change"
        style         = "max-width: 100%; min-width: 100%"
        rows          = "3"
        :tabIndex     = "tabIndex"
        v-disabled    = "!editable"
        :class        = "{ 'input-error-validation' : notvalid }"
        v-model       = "state.value"
      ></textarea>
    </template>
  </g3w-input>
</template>

<script>
export default {

  /** @since 3.8.6 */
  // name: "input-textarea",

  props: {
    state: {
      type: Object,
      required: true,
    },
  },

};
</script>

<style scoped>
  textarea {
    resize: none;
    border: 1px solid #cccccc;
  }
</style>