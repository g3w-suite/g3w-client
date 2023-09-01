<!--
  @file    Base input component
  
  @example see: components/InputText.vue
  
  @since   3.9.0

  @version 2.0 ADD SOURCE FROM: src/components/InputG3WFormInputs.vue@3.8
  @version 2.0 ADD SOURCE FROM: src/components/InputG3W.vue@3.8
  @version 1.0 ORIGINAL SOURCE: src/components/InputBase.vue@3.7
-->

<template>

  <!--
    Legacy InputG3WFormInputs component
    
    @example `<g3w-input _legacy="g3w-form" :addToValidate :removeToValidate :changeInput />`

    ORIGINAL SOURCE: src/components/InputG3WFormInputs.vue@3.8
    
    @since 3.9.0

    @TODO deprecate it or merge within the `Base G3WInput component` section
  -->
  <form v-if="_isLegacyInputG3WFormInputs" class="form-horizontal g3w-form">
    <div class="box-primary">
      <div class="box-body">
          <template v-for="field in state.fields">
            <g3w-input
              :state            = "field"
              :addToValidate    = "addToValidate"
              :changeInput      = "changeInput"
              :removeToValidate = "removeToValidate"
              @addToValidate    = "addToValidate"
              @changeInput      = "changeInput"
            />
          </template>
      </div>
      <div v-if="show_required_field_message" id="g3w-for-inputs-required-inputs-message">
        <span class="hide-cursor-caret-color">*</span>
        <span class="hide-cursor-caret-color" v-t="'sdk.form.footer.required_fields'"></span>
      </div>
    </div>
  </form>

  <!--
    Legacy InputG3W component
    
    @example `<g3w-input :addToValidate :removeToValidate :changeInput />`

    ORIGINAL SOURCE: src/components/InputG3W.vue@3.8
    
    @since 3.9.0

    @TODO deprecate it or merge within the `Base G3WInput component` section
  -->
  <div v-else-if="state.visible && _isLegacyG3WInput">

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

Object
  .entries({
    baseInputMixin,
    InputCheckbox,
    InputColor,
    InputDateTimePicker,
    InputFloat,
    InputInteger,
    InputLonLat,
    InputMedia,
    InputPickLayer,
    InputRadio,
    InputRange,
    InputSelect,
    InputSliderRange,
    InputTable,
    InputText,
    InputTextArea,
    InputTextHtml,
    InputUnique,
  })
  .forEach(([k, v]) => console.assert(undefined !== v, `${k} is undefined`));

const vm = {

  /** @since 3.9.0 */
  name: 'g3w-input',

  mixins: [
    baseInputMixin,
  ],

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

    /**
     * ORIGINAL SOURCE: src/components/InputG3WFormInputs.vue@3.8
     * 
     * @TODO double check optional props
     * 
     * @since 3.9.0
     */
    // state:                       { type: Object, default: { fields: [] } },
    // addToValidate:               { type: Function },
    // changeInput:                 { type: Function },
    // removeToValidate:            { type: Function },
    show_required_field_message: { type: Boolean, default: false },

    /**
     * Legacy input type.
     * 
     * BACKCOMP ONLY (v3.x)
     * 
     * ref: `g3wsdk.gui.vue.Inputs.G3wFormInputs`
     * 
     * @since 3.9.0
     */
     _legacy: {
      type: String,
      default: "",
    },

  },

  /**
   * ORIGINAL SOURCE: src/app/gui/inputs/inputs.js@3.8
   */
   components: {

    /**
     * ORIGINAL SOURCE: src/gui/inputs/text/vue/text.js@3.8
     * 
     * @since 3.9.0
     */
    'text_input': InputText,

    /**
     * ORIGINAL SOURCE: src/gui/inputs/texthtml/vue/texthtml.js@3.8
     * 
     * @since 3.9.0
     */
    'texthtml_input': InputTextHtml,

    /**
     * ORIGINAL SOURCE: src/gui/inputs/textarea/vue/textarea.js@3.8
     * 
     * @since 3.9.0
     */
    'textarea_input': InputTextArea,

    /**
     * ORIGINAL SOURCE: src/gui/inputs/integer/vue/integer.js@3.8
     * 
     * @since 3.9.0
     */
    'integer_input': InputInteger,

    /**
     * ORIGINAL SOURCE: src/gui/inputs/float/vue/float.js@3.8
     * 
     * @since 3.9.0
     */
    'float_input': InputFloat,

    /**
     * ORIGINAL SOURCE: src/gui/inputs/radio/vue/radio.js@3.8
     * 
     * @since 3.9.0
     */
    'radio_input': InputRadio,

    /**
     * ORIGINAL SOURCE: src/gui/inputs/checkbox/vue/checkbox.js@3.8
     * 
     * @since 3.9.0
     */
    'check_input': InputCheckbox,

    /**
     * ORIGINAL SOURCE: src/gui/inputs/range/vue/range.js@3.8
     * 
     * @since 3.9.0
     */
    'range_input': InputRange,

    /**
     * ORIGINAL SOURCE: src/gui/inputs/datetimepicker/vue/datetimepicker.js@3.8
     * 
     * @since 3.9.0
     */
    'datetimepicker_input': InputDateTimePicker,

    /**
     * ORIGINAL SOURCE: src/gui/inputs/unique/vue/unique.js@3.8
     * 
     * @since 3.9.0
     */
    'unique_input': InputUnique,

    /**
     * ORIGINAL SOURCE: src/gui/inputs/select/vue/select.js@3.8
     * 
     * @since 3.9.0
     */
    'select_input': InputSelect,

    /**
     * ORIGINAL SOURCE: src/gui/inputs/media/vue/media.js@3.8
     * 
     * @since 3.9.0
     */
    'media_input': InputMedia,

    /**
     * ORIGINAL SOURCE: src/gui/inputs/picklayer/vue/picklayer.js@3.8
     * 
     * @since 3.9.0
     */
    'picklayer_input': InputPickLayer,

    /**
     * ORIGINAL SOURCE: src/gui/inputs/color/vue/color.js@3.8
     * 
     * @since 3.9.0
     */
    'color_input': InputColor,

    /**
     * ORIGINAL SOURCE: src/gui/inputs/sliderrange/vue/sliderrange.js@3.8
     * 
     * @since 3.9.0
     */
    'slider_input': InputSliderRange,

    /**
     * ORIGINAL SOURCE: src/gui/inputs/lonlat/vue/lonlat.js@3.8
     * 
     * @since 3.9.0
     */
    'lonlat_input': InputLonLat,

    /**
     * ORIGINAL SOURCE: src/gui/inputs/table/vue/table.js@3.8
     * 
     * @since 3.9.0
     */
    'table_input': InputTable,

    },

  computed: {

    /**
     * Whether this is a Legacy InputG3WFormInputs component
     * 
     * @example `<g3w-input :show_required_field_message :addToValidate :removeToValidate :changeInput />`
     * 
     * @since 3.9.0
     */
    _isLegacyInputG3WFormInputs() {
      return 'g3w-form' === this._legacy;
    },

    /**
     * Whether this is a Legacy InputG3W component
     * 
     * @example `<g3w-input :addToValidate :removeToValidate :changeInput />`
     * 
     * @since 3.9.0
     */
    _isLegacyG3WInput() {
      const props = { a: this.addToValidate, b: this.removeToValidate, c: this.changeInput };
      return Object.values(props).every(v => "function" === typeof v) && !Object.values(props).some(v => undefined === v);
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
        const props = {
          addToValidate:    this.addToValidate,
          removeToValidate: this.removeToValidate,
          changeInput:      this.changeInput
        };
        console.assert(
          Object.values(props).every(v => "function" === typeof v) ||
          Object.values(props).every(v => undefined === v),
          '[%o] Invalid or missing required props: %o',
          this.type,
          props
        );
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
  #g3w-for-inputs-required-inputs-message {
    margin-bottom:5px;
    font-weight: bold;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .box-body {
    padding: 5px;
  }

  .control-label {
    text-align: left !important;
    padding-top: 0 !important;
    margin-bottom: 3px;
  }
</style>