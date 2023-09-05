<!--
  @file
  @since v3.7
-->

<template>
  <g3w-input :state="state">
    <template #body="{ change, tabIndex, editable, notvalid }">
      <div>
        <span style="font-weight: bold">{{state.value}}</span>
        <input
          @change    = "change"
          style      = "width: 100%; padding-right: 5px;"
          :tabIndex  = "tabIndex"
          v-disabled = "!editable"
          :class     = "{ 'input-error-validation' : notvalid }"
          v-model    = "state.value"
          :min       = "state.input.options.min"
          :max       = "state.input.options.max"
          type       = "range"
          :step      = "state.input.options.step"
        >
      </div>
    </template>
  </g3w-input>
</template>

<script>
export default {

  /** @since 3.8.6 */
  name: 'input-slider-range',

  props: {
    state: {
      type: Object,
      required: true,
    },
  },

  watch: {

    'state.input.options.min'() {
      this.$parent.getService().changeInfoMessage()
    },

    'state.input.options.max'() {
      this.$parent.getService().changeInfoMessage()
    },

  },

};
</script>