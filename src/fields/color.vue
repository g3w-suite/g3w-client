<!--
  @file

  ORIGINAL SOURCE: src/components/InputColor.vue@3.8

  @since 3.9.0
-->

<template>
  <g3w-field :state="state">

    <!-- 
      @example <g3w-field mode="input" _type="color" />
     -->
    <template #input-body="{ change, tabIndex, editable, notvalid }">
      <input
        :placeholder = "state.default"
        type         = "color"
        @change      = "change"
        :tabIndex    = "tabIndex"
        v-disabled   = "!editable"
        :field       = "state.name"
        class        = "form-control"
        style        = "cursor: pointer"
        v-model      = "state.value"
        :class       = "{ 'input-error-validation' : notvalid }"
        :id          = "state.name"
      >
    </template>

  </g3w-field>
</template>

<script>
import G3WField from 'components/G3WField.vue';

console.assert(undefined !== G3WField, 'G3WField is undefined');

export default {

  /** @since 3.8.6 */
  // name: 'input-color',

  components: {
    'g3w-field': G3WField,
  },

  props: {
    state: {
      type: Object,
      required: true,
    },
  },

};
</script>