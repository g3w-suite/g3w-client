<!-- ORIGINAL SOURCE: -->
<!-- gui/inputs/float/vue/float.html@v3.4 -->
<!-- gui/inputs/float/vue/float.js@v3.4 -->

<template>
  <baseinput :state="state">
    <input
      @change="change"
      @input="change"
      class="form-control"
      style="width:100%"
      v-disabled="!editable"
      :class="{'input-error-validation' : notvalid}"
      v-model="state.value"
      slot="body"
      type="number"
      :step="state.step || 1"
      :placeholder="state.default">
  </baseinput>
</template>

<script>
const Input = require('gui/inputs/input');

export default {
  mixins: [Input],
};
</script>