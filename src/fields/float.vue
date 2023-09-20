<!--
  @file

  ORIGINAL SOURCE: src/components/InputFloat.vue@3.8

  @since 3.9.0
-->

<template>
  <g3w-field :state="state">

    <!--
      @example <g3w-field mode="input" _type="float" />
     -->
    <template #input-body="{ change, tabIndex, editable, notvalid }">
      <input
        @change      = "change"
        @input       = "change"
        :tabIndex    = "tabIndex"
        v-disabled   = "!editable"
        :class       = "{ 'input-error-validation' : notvalid }"
        v-model      = "state.value"
        :step        = "state.step || 1"
        :placeholder = "state.default"
        class        = "form-control"
        style        = "width: 100%"
        type         = "number"
      >
    </template>

  </g3w-field>
</template>

<script>
import G3WField from 'components/G3WField.vue';

console.assert(undefined !== G3WField, 'G3WField is undefined');

export default {

  /** @since 3.8.6 */
  // name: 'input-float',

  components: {
    'g3w-field': G3WField,
  },

  props: {
    state: {
      type: Object,
      required: true,
    }
  }

};
</script>