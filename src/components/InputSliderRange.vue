<!--
  @file
  @since v3.7
-->

<template>
  <g3w-input :state="state">
    <div slot="body" >
      <span style="font-weight: bold">{{state.value}}</span>
      <input
        slot       = "body"
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
  </g3w-input>
</template>

<script>
import { baseInputMixin } from 'mixins';

export default {

  /** @since 3.8.6 */
  name: 'input-slider-range',

  mixins: [ baseInputMixin ],

  watch: {

    'state.input.options.min'() {
      this.service.changeInfoMessage()
    },

    'state.input.options.max'() {
      this.service.changeInfoMessage()
    },

  },

};
</script>