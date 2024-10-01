<!--
  @file
  @since v3.7
-->

<template>
  <baseinput :state = "state">
    <div slot = "body" >
      <span style = "font-weight: bold">{{state.value}}</span>
      <input
        slot       = "body"
        @change    = "change"
        style      = "width:100%; padding-right: 5px;"
        :tabIndex  = "tabIndex"
        v-disabled = "!editable"
        :class     = "{'input-error-validation' : notvalid}"
        v-model    = "state.value"
        :min       = "state.input.options.min"
        :max       = "state.input.options.max"
        type       = "range"
        :step      = "state.input.options.step">
    </div>
  </baseinput>
</template>

<script>
  const Input = require('gui/inputs/input');

  export default {

    /** @since 3.8.6 */
    name: 'input-slider-range',

    mixins: [Input],
    watch:{
      'state.input.options.min'() {
        this.service.changeInfoMessage()
      },
      'state.input.options.max'() {
        this.service.changeInfoMessage()
      }
    }
  };
</script>