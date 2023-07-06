<!--
  @file
  @since v3.7
-->

<template>
  <div v-if="state.visible">

    <div v-if="'child' !== state.type">
      <component
        @changeinput      = "changeInput"
        :changeInput      = "changeInput"
        @addinput         = "addToValidate"
        :addToValidate    = "addToValidate"
        @removeinput      = "removeToValidate"
        :removeToValidate = "removeToValidate"
        :state            = "state"
        :is               = "type"
      />
      <span class="divider"></span>
    </div>

    <div
      v-else
      style="border-top: 2px solid"
      class="skin-border-color field-child"
    >
      <h4 style="font-weight: bold">{{ state.label}}</h4>
      <div> {{ state.description }} </div>
      <g3w-input
        v-for="field in state.fields"
        :key              = "field.name"
        :state            = "field"
        @changeinput      = "changeInput"
        :changeInput      = "changeInput"
        @addinput         = "addToValidate"
        :addToValidate    = "addToValidate"
        @removeinput      = "removeToValidate"
        :removeToValidate = "removeToValidate"
      />
    </div>

  </div>
</template>

<script>
import * as InputCheckbox       from 'components/InputCheckbox.vue';
import * as InputColor          from 'components/InputColor.vue';
import * as InputDateTimePicker from 'components/InputDateTimePicker.vue';
import * as InputFloat          from 'components/InputFloat.vue';
import * as InputInteger        from 'components/InputInteger.vue';
import * as InputLonLat         from 'components/InputLonLat.vue';
import * as InputMedia          from 'components/InputMedia.vue';
import * as InputPickLayer      from 'components/InputPickLayer.vue';
import * as InputRadio          from 'components/InputRadio.vue';
import * as InputRange          from 'components/InputRange.vue';
import * as InputSelect         from 'components/InputSelect.vue';
import * as InputSliderRange    from 'components/InputSliderRange.vue';
import * as InputTable          from 'components/InputTable.vue';
import * as InputText           from 'components/InputText.vue';
import * as InputTextArea       from 'components/InputTextArea.vue';
import * as InputTextHtml       from 'components/InputTextHtml.vue';
import * as InputUnique         from 'components/InputUnique.vue';

const vm = {

  name: "g3w-input",

  props: {

    state: {
      required: true
    },

    addToValidate: {
      type: Function,
      required: true
    },

    removeToValidate: {
      type: Function,
      required: true
    },

    changeInput: {
      type: Function,
      required: true
    },

  },

  /**
   * ORIGINAL SOURCE: src/app/gui/inputs/inputs.js@3.8
   * 
   * @TODO find how to get rid of all those `vue.extend` calls
   */
  components: {

    /**
     * ORIGINAL SOURCE: src/gui/inputs/text/vue/text.js@3.8
     */
    'text_input': Vue.extend(InputText),

    /**
     * ORIGINAL SOURCE: src/gui/inputs/texthtml/vue/texthtml.js@3.8
     */
    'texthtml_input': Vue.extend(InputTextHtml),

    /**
     * ORIGINAL SOURCE: src/gui/inputs/textarea/vue/textarea.js@3.8
     */
    'textarea_input': Vue.extend(InputTextArea),

    /**
     * ORIGINAL SOURCE: src/gui/inputs/integer/vue/integer.js@3.8
     */
    'integer_input': Vue.extend(InputInteger),

    /**
     * ORIGINAL SOURCE: src/gui/inputs/float/vue/float.js@3.8
     */
    'float_input': Vue.extend(InputFloat),

    /**
     * ORIGINAL SOURCE: src/gui/inputs/radio/vue/radio.js@3.8
     */
    'radio_input': Vue.extend(InputRadio),

    /**
     * ORIGINAL SOURCE: src/gui/inputs/checkbox/vue/checkbox.js@3.8
     */
    'check_input': Vue.extend(InputCheckbox),

    /**
     * ORIGINAL SOURCE: src/gui/inputs/range/vue/range.js@3.8
     */
    'range_input': Vue.extend(InputRange),

    /**
     * ORIGINAL SOURCE: src/gui/inputs/datetimepicker/vue/datetimepicker.js@3.8
     */
    'datetimepicker_input': Vue.extend(InputDateTimePicker),

    /**
     * ORIGINAL SOURCE: src/gui/inputs/unique/vue/unique.js@3.8
     */
    'unique_input': Vue.extend(InputUnique),

    /**
     * ORIGINAL SOURCE: src/gui/inputs/select/vue/select.js@3.8
     */
    'select_input': Vue.extend(InputSelect),

    /**
     * ORIGINAL SOURCE: src/gui/inputs/media/vue/media.js@3.8
     */
    'media_input': Vue.extend(InputMedia),

    /**
     * ORIGINAL SOURCE: src/gui/inputs/picklayer/vue/picklayer.js@3.8
     */
    'picklayer_input': Vue.extend(InputPickLayer),

    /**
     * ORIGINAL SOURCE: src/gui/inputs/color/vue/color.js@3.8
     */
    'color_input': Vue.extend(InputColor),

    /**
     * ORIGINAL SOURCE: src/gui/inputs/sliderrange/vue/sliderrange.js@3.8
     */
    'slider_input': Vue.extend(InputSliderRange),

    /**
     * ORIGINAL SOURCE: src/gui/inputs/lonlat/vue/lonlat.js@3.8
     */
    'lonlat_input': Vue.extend(InputLonLat),

    /**
     * ORIGINAL SOURCE: src/gui/inputs/table/vue/table.js@3.8
     */
    'table_input': Vue.extend(InputTable),

  },

  computed: {

    type() {
      if ('child' !== this.state.type) {
        return (this.state.input.type ? this.state.input.type : this.state.type + '_input');
      }
    }

  },

  created() {
    //TEMPORARY
    if ('child' !== this.state.type && !this.state.input.options) {
      this.state.input.options = {};
    }
  },

};

/**
 * BACKCOMP
 */
vm.components['select_autocomplete_input'] = vm.components['select_input'];
vm.components['string_input']              = vm.components['text_input'];

export default vm;

</script>