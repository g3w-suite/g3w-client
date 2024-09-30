<!--
  @file
  @since v3.7
-->

<template>
  <baseinput :state="state">
    <input
       slot        = "body"
      :placeholder = "state.default"
      @keyup       = "isMobile() ? mobileChange($event) : change()"
      :tabIndex    = "tabIndex"
      v-disabled   = "!editable"
      :field       = "state.name"
      v-model      = "state.value"
      class        = "form-control"
      :class       = "{'input-error-validation' : notvalid}"
      :id          = "state.name">
  </baseinput>
</template>

<script>
  export default {
    /** @since 3.8.6 */
    name: "input-text",
  };
</script>