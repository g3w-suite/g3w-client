<!--
  @file

  ORIGINAL SOURCE: src/components/FieldText.vue@3.8
  ORIGINAL SOURCE: src/components/InputText.vue@3.8

  @since 3.9.0
-->

<template>
  <g3w-field :state="state">

    <!--
      @example <g3w-field mode="input" _type="text" />
     -->
    <template #input-body="{ mobileChange, change, tabIndex, editable, notvalid }">
      <input
        :placeholder = "state.default"
        @keyup       = "isMobile() ? mobileChange($event) : change()"
        :tabIndex    = "tabIndex"
        v-disabled   = "!editable"
        :field       = "state.name"
        class        = "form-control"
        v-model      = "state.value"
        :class       = "{ 'input-error-validation' : notvalid }"
        :id          = "state.name"
      >
    </template>

    <!--
      @example <g3w-field mode="read" _type="text" />
    -->
    <template #field-value="{ state }">
      <span
        style  = "word-wrap: break-word;"
        v-html = "state.value"
      ></span>
    </template>

  </g3w-field>
</template>

<script>
import G3WField from 'components/G3WField.vue';

console.assert(undefined !== G3WField, 'G3WField is undefined');

export default {

  /** @since 3.8.6 */
  // name: "input-text",

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