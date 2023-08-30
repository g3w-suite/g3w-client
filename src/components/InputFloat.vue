<!--
  @file
  @since v3.7
-->

<template>
  <baseinput :state="state">

    <template v-slot:body="bodySlotProps">

      <input
        @change      = "bodySlotProps.change"
        @input       = "bodySlotProps.change"
        :tabIndex    = "bodySlotProps.tabIndex"
        v-disabled   = "!bodySlotProps.editable"
        :class       = "{ 'input-error-validation' : bodySlotProps.notvalid }"
        v-model      = "state.value"
        :step        = "state.step || 1"
        :placeholder = "state.default"
        class        = "form-control"
        style        = "width: 100%"
        type         = "number"
      >
    </template>

  </baseinput>

</template>

<script>

export default {

  /** @since 3.8.6 */
  name: 'input-float',

  props: {
    state: {
      type: Object,
      required: true,
    }
  }

};
</script>