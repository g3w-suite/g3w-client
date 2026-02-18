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

  const Inputs = {
    'text_input':                Vue.extend(InputText),
    'texthtml_input':            Vue.extend(InputTextHtml),
    'textarea_input':            Vue.extend(InputTextArea),
    'integer_input':             Vue.extend(InputInteger),
    'string_input':              Vue.extend(InputText), //temporary
    'float_input':               Vue.extend(InputFloat),
    'radio_input':               Vue.extend(InputRadio),
    'check_input':               Vue.extend(InputCheckbox),
    'range_input':               Vue.extend(InputRange),
    'datetimepicker_input':      Vue.extend(InputDateTimePicker),
    'unique_input':              Vue.extend(InputUnique),
    'select_input':              Vue.extend(InputSelect),
    'media_input':               Vue.extend(InputMedia),
    'select_autocomplete_input': Vue.extend(InputSelect),
    'picklayer_input':           Vue.extend(InputPickLayer),
    'color_input':               Vue.extend(InputColor),
    'slider_input':              Vue.extend(InputSliderRange),
    'lonlat_input':              Vue.extend(InputLonLat),
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
        /**@since 4.0.7 set integer and bigint as integer input (numeric) */
        if (['integer', 'bigint'].includes(this.state.type)) {
          return 'integer_input';
        }
        //In case of float, use float input (numeric)
        if (['float'].includes(this.state.type)) {
          return 'float_input';
        }
        return this.state.input.type ? `${this.state.input.type}_input`: `${this.state.type}_input`;
      }
    },
    created() {
      //TEMPORARY
      this.state.input.options = this.state.input.options || {};
    }
  };
</script>
