<!--
  @file
  @since v3.7
-->

<template>
  <baseinput :state="state">
    <template v-slot:body="bodySlotProps">
      {{bodySlotProps.change}}
      <input
        :placeholder = "state.default"
        @keyup       = "isMobile() ? bodySlotProps.mobileChange($event) : bodySlotProps.change()"
        :tabIndex    = "bodySlotProps.tabIndex"
        v-disabled   = "!bodySlotProps.editable"
        :field       = "state.name"
        class        = "form-control"
        v-model      = "state.value"
        :class       = "{ 'input-error-validation' : bodySlotProps.notvalid }"
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
    },
  },
};
</script>