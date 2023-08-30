<!--
  @file
  @since v3.7
-->

<template>
  <baseinput :state="state">

    <template v-slot:body="bodySlotProps">
      <input
        :placeholder = "state.default"
        @change      = "bodySlotProps.change"
        @input       = "bodySlotProps.change"
        class        = "form-control"
        style        = "width: 100%"
        :tabIndex    = "bodySlotProps.tabIndex"
        v-disabled   = "!bodySlotProps.editable"
        :class       = "{ 'input-error-validation' : bodySlotProps.notvalid }"
        v-model      = "state.value"
        type         = "number"
      >
    </template>

  </baseinput>

</template>

<script>

export default {

  /** @since 3.8.6 */
  name: 'input-integer',

  props: {
    state: {
      type: Object,
      required: true,
    }
  }

};
</script>