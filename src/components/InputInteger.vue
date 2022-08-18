<!-- ORIGINAL SOURCE: -->
<!-- gui/inputs/integer/vue/integer.html@v3.4 -->
<!-- gui/inputs/integer/vue/integer.js@v3.4 -->

<template>
  <baseinput :state="state">
    <input
      :placeholder="state.default"
      @change="change"
      @input="change"
      class="form-control"
      style="width:100%"
      v-disabled="!editable"
      :class="{'input-error-validation' : notvalid}"
      v-model="state.value"
      slot="body"
      type="number">
  </baseinput>
</template>

<script>
const Input = require('gui/inputs/input');

export default {
  mixins: [Input],
};
</script>