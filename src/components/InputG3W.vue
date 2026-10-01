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
        :is               = "type"
      ></component>
      <divider/>
    </div>

    <div
      v-else
      style = "border-top: 2px solid"
      class = "skin-border-color field-child"
    >
      <h4 style = "font-weight: bold">{{ state.label}}</h4>
      <div> {{ state.description }} </div>
      <g3w-input
        v-for             = "field in state.fields" :key = "field.name"
        :state            = "field"
        @changeinput      = "changeInput"
        :changeInput      = "changeInput"
        @addinput         = "addToValidate"
        :addToValidate    = "addToValidate"
        @removeinput      = "removeToValidate"
        :removeToValidate = "removeToValidate"
      ></g3w-input>
    </div>
  </div>
</template>

<script>
  import InputCheckbox                               from 'components/InputCheckbox.vue';
  import InputColor                                  from 'components/InputColor.vue';
  import InputDateTimePicker                         from 'components/InputDateTimePicker.vue';
  import InputFloat                                  from 'components/InputFloat.vue';
  import InputInteger                                from 'components/InputInteger.vue';
  import InputLonLat                                 from 'components/InputLonLat.vue';
  import InputMedia                                  from 'components/InputMedia.vue';
  import InputPickLayer                              from 'components/InputPickLayer.vue';
  import InputRadio                                  from 'components/InputRadio.vue';
  import InputSelect                                 from 'components/InputSelect.vue';
  import InputRange                                  from 'components/InputRange.vue';
  import InputSliderRange                            from 'components/InputSliderRange.vue';
  import InputText                                   from 'components/InputText.vue';
  import InputTextArea                               from 'components/InputTextArea.vue';
  import InputTextHtml                               from 'components/InputTextHtml.vue';
  import InputUnique                                 from 'components/InputUnique.vue';

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
      'text_input':                InputText,
      'texthtml_input':            InputTextHtml,
      'textarea_input':            InputTextArea,
      'integer_input':             InputInteger,
      'bigint_input':              InputInteger,
      'string_input':              InputText, //temporary
      'float_input':               InputFloat,
      'radio_input':               InputRadio,
      'check_input':               InputCheckbox,
      'range_input':               InputRange,
      'datetimepicker_input':      InputDateTimePicker,
      'unique_input':              InputUnique,
      'select_input':              InputSelect,
      'media_input':               InputMedia,
      'select_autocomplete_input': InputSelect,
      'picklayer_input':           InputPickLayer,
      'color_input':               InputColor,
      'slider_input':              InputSliderRange,
      'lonlat_input':              InputLonLat,
    },
    computed: {
      type() {
        /** @since 4.0.8 set integer,bigint, float and  'text' === this.state.input.type set (numeric) input dom type */
        if (['integer', 'bigint', 'float'].includes(this.state.type) && 'text' === this.state.input.type) {
          return `${this.state.type}_input`;
        }
        return `${this.state.input?.type ?? this.state.type}_input`;
      }
    },
    created() {
      //TEMPORARY
      this.state.input.options = this.state.input.options || {};
    }
  };
</script>
