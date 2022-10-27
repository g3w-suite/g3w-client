<!-- ORIGINAL SOURCE: -->
<!-- gui/inputs/color/vue/color.html@v3.4 -->
<!-- gui/inputs/color/vue/color.js@v3.4 -->

<template>
  <baseinput :state="state">
    <input
      :placeholder="state.default"
      type="color"
      slot="body"
      @change="change"
      v-disabled="!editable"
      :field="state.name"
      class="form-control"
      style="cursor: pointer"
      v-model="state.value"
      :class="{'input-error-validation' : notvalid}"
      :id="state.name">
  </baseinput>
</template>

<script>
const Input = require('gui/inputs/input');

export default {
  mixins: [Input]
};
</script>