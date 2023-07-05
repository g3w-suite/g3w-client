<!--
  @file
  @since v3.7
-->

<template>
  <baseinput :state="state">
    <input
      :placeholder="state.default"
      slot="body"
      @keyup="isMobile() ? mobileChange($event) : change()"
      :tabIndex="tabIndex"
      v-disabled="!editable"
      :field="state.name"
      class="form-control"
      v-model="state.value"
      :class="{'input-error-validation' : notvalid}"
      :id="state.name">
  </baseinput>
</template>

<script>
import { baseInputsMixin } from 'mixins';

export default {
  mixins: [ baseInputsMixin ]
};
</script>