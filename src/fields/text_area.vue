<!--
  @file
  
  ORIGINAL SOURCE: src/components/InputTextArea.vue@3.8

  @since 3.9.0
-->

<template>
  <g3w-field :state="state">

    <!--
      @example <g3w-field mode="input" _type="textarea" />
     -->
    <template #input-body="{ change, tabIndex, editable, notvalid }">
      <textarea
        @keydown.stop = ""
        :placeholder  = "state.default"
        @input        = "change"
        @change       = "change"
        style         = "max-width: 100%; min-width: 100%"
        rows          = "3"
        :tabIndex     = "tabIndex"
        v-disabled    = "!editable"
        :class        = "{ 'input-error-validation' : notvalid }"
        v-model       = "state.value"
      ></textarea>
    </template>

</g3w-field>
</template>

<script>
import G3WField from 'components/G3WField.vue';

console.assert(undefined !== G3WField, 'G3WField is undefined');

export default {

  /** @since 3.8.6 */
  // name: "input-textarea",

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

<style scoped>
  textarea {
    resize: none;
    border: 1px solid #cccccc;
  }
</style>