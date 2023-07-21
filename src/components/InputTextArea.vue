<!--
  @file
  @since v3.7
-->

<template>
  <baseinput :state="state">
    <textarea
      @keydown.stop=""
      :placeholder="state.default"
      @input="change"
      @change="change"
      slot="body"
      style="max-width: 100%; min-width: 100%"
      rows="3"
      :tabIndex="tabIndex"
      v-disabled="!editable"
      :class="{'input-error-validation' : notvalid}"
      v-model="state.value"></textarea>
  </baseinput>
</template>

<script>
const Input = require('gui/inputs/input');

export default {

  /** @since 3.8.6 */
  name: "input-textarea",

  mixins: [Input],
};
</script>

<style scoped>
  textarea {
    resize: none;
    border: 1px solid #cccccc;
  }
</style>