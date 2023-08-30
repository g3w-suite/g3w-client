<!--
  @file    Base input component
  
  @example see: components/InputText.vue
  
  @since   3.9.0

  @version 2.0 ADD SOURCE FROM: src/components/InputG3W.vue@3.8 
  @version 1.0 ORIGINAL SOURCE: src/components/InputBase.vue@3.7
-->

<template>

  <!--
    Legacy InputG3W component
    
    @example `<g3w-input :addToValidate :removeToValidate :changeInput />`

    ORIGINAL SOURCE: src/components/InputG3W.vue@3.8
    
    @since 3.9.0

    @TODO deprecate it or merge within the `Base G3WInput component` section
  -->
  <div v-if="state.visible && !this._isLegacyG3WInput">

    <div
      v-if  = "'child' === state.type"
      style = "border-top: 2px solid"
      class = "skin-border-color field-child"
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

    <div v-else>
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

  </div>

  <!--
    Base G3WInput component

    @example `<g3w-input :state />`

    ORIGINAL SOURCE: src/components/InputBase.vue@3.8

    @since 3.7.0
  -->

  <div v-else-if="state.visible" class="form-group">

    <!-- INPUT LABEL -->
    <slot name="label">
      <label :for="state.name" v-disabled="!editable" class="col-sm-12 control-label">{{ state.label }}
        <span v-if="state.validate && state.validate.required">*</span>
        <i
          v-if   = "showhelpicon"
          :class ="g3wtemplate.font['info']"
          class  = "skin-color"
          style  = "margin-left: 3px; cursor: pointer"
          @click = "showHideHelp"
        ></i>
        <slot name="label-action"></slot>
      </label>
    </slot>

    <div class="col-sm-12">

      <!-- LOADING BAR -->
      <slot name="loading">
        <div
          v-if="'loading' === loadingState"
          style="position:relative; width: 100%"
          slot="loading"
        >
          <bar-loader loading="true" />
        </div>
      </slot>

      <!-- INPUT ELEMENT (eg. components/InputText.vue) -->
      <slot
        name          = "body"
        :editable     = "editable"
        :notvalid     = "notvalid"
        :tabIndex     = "tabIndex"
        :change       = "change"
        :mobileChange = "mobileChange"
      />

      <!-- ERROR MESSAGES -->
      <slot name="message">
        <p
          v-if      = "notvalid"
          class     = "g3w-long-text error-input-message"
          style     = "margin: 0"
          v-html    = "state.validate.message"
        ></p>
        <p
          v-else-if = "state.info"
          style     = "margin: 0"
          v-html    = "state.info"
        ></p>
      </slot>

      <!-- HELP MESSAGE -->
      <div
        v-if        = "state.help && this.state.help.visible"
        class       = "g3w_input_help skin-background-color extralighten"
        v-html      = "state.help.message"
      ></div>

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

import { baseInputMixin } from 'mixins';

console.assert(undefined !== baseInputMixin,      'baseInputMixin is undefined');

const vm = {

  /** @since 3.9.0 */
  name: 'g3w-input',

  mixins: [baseInputMixin],

  props: {

    state: {
      required: true
    },

    /**
     * ORIGINAL SOURCE: src/components/InputG3W.vue@3.8
     * 
     * @since 3.9.0
     */
    addToValidate: {
      type: Function,
      required: false,
    },

    /**
     * ORIGINAL SOURCE: src/components/InputG3W.vue@3.8
     * 
     * @since 3.9.0
     */
    removeToValidate: {
      type: Function,
      required: false,
    },

    /**
     * ORIGINAL SOURCE: src/components/InputG3W.vue@3.8
     * 
     * @since 3.9.0
     */
    changeInput: {
      type: Function,
      required: false
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
     * 
     * @since 3.9.0
     */
    'text_input': Vue.extend(InputText),

    /**
     * ORIGINAL SOURCE: src/gui/inputs/texthtml/vue/texthtml.js@3.8
     * 
     * @since 3.9.0
     */
    'texthtml_input': Vue.extend(InputTextHtml),

    /**
     * ORIGINAL SOURCE: src/gui/inputs/textarea/vue/textarea.js@3.8
     * 
     * @since 3.9.0
     */
    'textarea_input': Vue.extend(InputTextArea),

    /**
     * ORIGINAL SOURCE: src/gui/inputs/integer/vue/integer.js@3.8
     * 
     * @since 3.9.0
     */
    'integer_input': Vue.extend(InputInteger),

    /**
     * ORIGINAL SOURCE: src/gui/inputs/float/vue/float.js@3.8
     * 
     * @since 3.9.0
     */
    'float_input': Vue.extend(InputFloat),

    /**
     * ORIGINAL SOURCE: src/gui/inputs/radio/vue/radio.js@3.8
     * 
     * @since 3.9.0
     */
    'radio_input': Vue.extend(InputRadio),

    /**
     * ORIGINAL SOURCE: src/gui/inputs/checkbox/vue/checkbox.js@3.8
     * 
     * @since 3.9.0
     */
    'check_input': Vue.extend(InputCheckbox),

    /**
     * ORIGINAL SOURCE: src/gui/inputs/range/vue/range.js@3.8
     * 
     * @since 3.9.0
     */
    'range_input': Vue.extend(InputRange),

    /**
     * ORIGINAL SOURCE: src/gui/inputs/datetimepicker/vue/datetimepicker.js@3.8
     * 
     * @since 3.9.0
     */
    'datetimepicker_input': Vue.extend(InputDateTimePicker),

    /**
     * ORIGINAL SOURCE: src/gui/inputs/unique/vue/unique.js@3.8
     * 
     * @since 3.9.0
     */
    'unique_input': Vue.extend(InputUnique),

    /**
     * ORIGINAL SOURCE: src/gui/inputs/select/vue/select.js@3.8
     * 
     * @since 3.9.0
     */
    'select_input': Vue.extend(InputSelect),

    /**
     * ORIGINAL SOURCE: src/gui/inputs/media/vue/media.js@3.8
     * 
     * @since 3.9.0
     */
    'media_input': Vue.extend(InputMedia),

    /**
     * ORIGINAL SOURCE: src/gui/inputs/picklayer/vue/picklayer.js@3.8
     * 
     * @since 3.9.0
     */
    'picklayer_input': Vue.extend(InputPickLayer),

    /**
     * ORIGINAL SOURCE: src/gui/inputs/color/vue/color.js@3.8
     * 
     * @since 3.9.0
     */
    'color_input': Vue.extend(InputColor),

    /**
     * ORIGINAL SOURCE: src/gui/inputs/sliderrange/vue/sliderrange.js@3.8
     * 
     * @since 3.9.0
     */
    'slider_input': Vue.extend(InputSliderRange),

    /**
     * ORIGINAL SOURCE: src/gui/inputs/lonlat/vue/lonlat.js@3.8
     * 
     * @since 3.9.0
     */
    'lonlat_input': Vue.extend(InputLonLat),

    /**
     * ORIGINAL SOURCE: src/gui/inputs/table/vue/table.js@3.8
     * 
     * @since 3.9.0
     */
    'table_input': Vue.extend(InputTable),

    },

  computed: {

    /**
     * Whether this is a Legacy InputG3W component
     * 
     * @example `<g3w-input :addToValidate :removeToValidate :changeInput />`
     * 
     * @since 3.9.0
     */
    _isLegacyG3WInput() {
      const props = { a: this.addToValidate, b: this.removeToValidate, c: this.changeInput};
      return Object.values(props).every(v => Function === typeof v) && !Object.values(props).some(v => undefined === v);
    },

    /**
     * ORIGINAL SOURCE: src/components/InputG3W.vue@3.8
     * 
     * @since 3.9.0
     */
    type() {
      if ('child' !== this.state.type) {
        return `${this.state.input.type ? this.state.input.type : this.state.type}_input`;
      }
    },

  },

  watch: {

    /**
     * Validate optional props
     * 
     * @since 3.9.0
     */
    $props: {
      immediate: true,
      handler() {
        const props = { a: this.addToValidate, b: this.removeToValidate, c: this.changeInput};
        is_valid = Object.values(props).every(v => Function === typeof v) || Object.values(props).every(v => undefined === v);
        if (!is_valid) {
          console.error('Invalid or missing required props: `addToValidate`, `removeToValidate`, `changeInput`');
        }
      }
    },

  },

};

/**
 * BACKCOMP
 */
vm.components['select_autocomplete_input'] = vm.components['select_input'];
vm.components['string_input']              = vm.components['text_input'];

export default vm;

</script>

<style scoped>
  .control-label {
    text-align: left !important;
    padding-top: 0 !important;
    margin-bottom: 3px;
  }
</style>