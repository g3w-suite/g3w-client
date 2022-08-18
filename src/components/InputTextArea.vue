<!-- ORIGINAL SOURCE: -->
<!-- gui/inputs/textarea/vue/textarea.html@v3.4 -->
<!-- gui/inputs/textarea/vue/textarea.js@v3.4 -->

<template>
  <baseinput :state="state">
    <textarea
      :placeholder="state.default"
      @input="change"
      @change="change"
      slot="body"
      style="max-width: 100%; min-width: 100%"
      v-disabled="!editable"
      :class="{'input-error-validation' : notvalid}"
      v-model="state.value"></textarea>
  </baseinput>
</template>

<script>
const Input = require('gui/inputs/input');

export default {
  mixins: [Input],
};
</script>