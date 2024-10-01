<!--
  @file
  @since v3.7
-->

<template>
  <div v-if = "state.visible">

    <div v-if = "state.type !== 'child'">
      <component
        @changeinput      = "changeInput"
        :changeInput      = "changeInput"
        @addinput         = "addToValidate"
        :addToValidate    = "addToValidate"
        @removeinput      = "removeToValidate"
        :removeToValidate = "removeToValidate"
        :state            = "state"
        :is               = "type">
      </component>
      <divider/>
    </div>

    <div
      v-else
      style = "border-top: 2px solid"
      class = "skin-border-color field-child"
    >
      <h4 style = "font-weight: bold">{{ state.label}}</h4>
      <div> {{ state.description }} </div>
      <g3w-input v-for = "field in state.fields" :key = "field.name"
        :state="field"
        @changeinput      = "changeInput"
        :changeInput      = "changeInput"
        @addinput         = "addToValidate"
        :addToValidate    = "addToValidate"
        @removeinput      = "removeToValidate"
        :removeToValidate = "removeToValidate">
      </g3w-input>
    </div>
  </div>
</template>

<script>
  const Inputs = {
    'text_input':                require('gui/inputs/text/vue/text'),
    'texthtml_input':            require('gui/inputs/texthtml/vue/texthtml'),
    'textarea_input':            require('gui/inputs/textarea/vue/textarea'),
    'integer_input':             require('gui/inputs/integer/vue/integer'),
    'string_input':              require('gui/inputs/text/vue/text'), //temporary
    'float_input':               require('gui/inputs/float/vue/float'),
    'radio_input':               require('gui/inputs/radio/vue/radio'),
    'check_input':               require('gui/inputs/checkbox/vue/checkbox'),
    'range_input':               require('gui/inputs/range/vue/range'),
    'datetimepicker_input':      require('gui/inputs/datetimepicker/vue/datetimepicker'),
    'unique_input':              require('gui/inputs/unique/vue/unique'),
    'select_input':              require('gui/inputs/select/vue/select'),
    'media_input':               require('gui/inputs/media/vue/media'),
    'select_autocomplete_input': require('gui/inputs/select/vue/select'),
    'picklayer_input':           require('gui/inputs/picklayer/vue/picklayer'),
    'color_input':               require('gui/inputs/color/vue/color'),
    'slider_input':              require('gui/inputs/sliderrange/vue/sliderrange'),
    'lonlat_input':              require('gui/inputs/lonlat/vue/lonlat'),
  };

  export default {
    name: "g3w-input",
    props: {
      state: {
        required: true
      },
      addToValidate:{
        type: Function,
        required: true
      },
      removeToValidate:{
        type: Function,
        required: true
      },
      changeInput: {
        type: Function,
        required: true
      }
    },
    components: {
      ...Inputs
    },
    computed: {
      type() {
        if (this.state.type !== 'child')
          return this.state.input.type ? `${this.state.input.type}_input`: `${this.state.type}_input`;
      }
    },
    created() {
      //TEMPORARY
      if (this.state.type !== 'child' && !this.state.input.options)
        this.state.input.options = {};
    }
  };
</script>
