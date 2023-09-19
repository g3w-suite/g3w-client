<!--
  @file

  ORIGINAL SOURCE: src/components/InputInteger.vue@3.8

  @since 3.9.0
-->

<template>
  <g3w-field :state="state">
    
    <!--
      @example <g3w-field mode="input" _type="integer" />
     -->
    <template #input-body="{ change, tabIndex, editable, notvalid }">
      <input
        :placeholder = "state.default"
        @change      = "change"
        @input       = "change"
        class        = "form-control"
        style        = "width: 100%"
        :tabIndex    = "tabIndex"
        v-disabled   = "!editable"
        :class       = "{ 'input-error-validation' : notvalid }"
        v-model      = "state.value"
        type         = "number"
      >
    </template>

  </g3w-field>
</template>

<script>

export default {

  /** @since 3.8.6 */
  // name: 'input-integer',

  props: {
    state: {
      type: Object,
      required: true,
    }
  }

};
</script>