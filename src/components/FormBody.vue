<!--
  @file

  @since 3.7

  @version 2.0 ADD SOURCE FROM: src/components/InputG3WFormInputs.vue@3.8
  @version 1.0 ORIGINAL SOURCE: src/components/FormBody.vue@3.7
-->

<template>
<!--
  ORIGINAL SOURCE: src/components/FormBody.vue@3.8
-->
<div v-if="__hasWrapper">
  <form class="form-horizontal g3w-form">
    <div class="box-primary">
      <div class="box-body">
        <tabs v-if="hasFormStructure"
          contenttype       = "editing"
          :layerid          = "state.layerid"
          :feature          = "state.feature"
          :handleRelation   = "handleRelation"
          :addToValidate    = "_addToValidate"
          :changeInput      = "_changeInput"
          :removeToValidate = "_removeToValidate"
          :tabs             = "state.formstructure"
          :fields           = "state.fields"
        />
        <form v-else class="form-horizontal g3w-form">
          <div class="box-primary">
            <div class="box-body">
              <g3w-field
                v-for              = "field in state.fields"
                :state             = "field"
                :addToValidate     = "_addToValidate"
                :removeToValidate  = "_removeToValidate"
                :changeInput       = "_changeInput"
                @changeinput       = "_changeInput"
                @addinput          = "_addToValidate"
                @removeinput       = "_removeToValidate"
                mode               = "input"
                _type              = "legacy"
              />
            </div>
          </div>
        </form>
      </div>
    </div>
  </form>
</div>

<!--
  ORIGINAL SOURCE: src/components/InputG3WFormInputs.vue@3.8

  @since 3.9.0
-->
<form v-else class="form-horizontal g3w-form">
  <div class="box-primary">
    <div class="box-body">
      <g3w-field
        v-for             = "field in state.fields"
        :state            = "field"
        :addToValidate    = "addToValidate"
        :removeToValidate = "removeToValidate"
        :changeInput      = "changeInput"
        @changeinput      = "changeInput"
        @addinput         = "addToValidate"
        @removeinput      = "removeToValidate"
        mode              = "input"
        _type             = "legacy"
      />
    </div>
    <div v-if="show_required_field_message" id="g3w-for-inputs-required-inputs-message">
      <span class="hide-cursor-caret-color">*</span>
      <span class="hide-cursor-caret-color" v-t="'sdk.form.footer.required_fields'"></span>
    </div>
  </div>
</form>
</template>

<script>
import G3WField from 'components/G3WField.vue';

console.assert(undefined !== G3WField, 'G3WField is undefined')

/**
 * @TODO remove "Vue.extend" from module export
 */
export default Vue.extend({

  /** @since 3.8.6 */
  name: 'form-body',

  components: {
    'g3w-field': G3WField,
  },

  props: {

    state: {
      type: Object,
      default: { fields: [] }
    },

    handleRelation: {
      type: Function,
    },

    /**
     * ORIGINAL SOURCE: src/components/InputG3WFormInputs.vue@3.8
     * 
     * @since 3.9.0
     */
    addToValidate: {
      type: Function
    },

    /**
     * ORIGINAL SOURCE: src/components/InputG3WFormInputs.vue@3.8
     * 
     * @since 3.9.0
     */
    changeInput: {
      type: Function
    },

    /**
     * ORIGINAL SOURCE: src/components/InputG3WFormInputs.vue@3.8
     * 
     * @since 3.9.0
     */
    removeToValidate: {
      type: Function
    },

    /**
     * ORIGINAL SOURCE: src/components/InputG3WFormInputs.vue@3.8
     * 
     * @since 3.9.0
     */
    show_required_field_message: {
      type: Boolean,
      default: false
    },

    /**
     * Legacy form type.
     * 
     * BACKCOMP ONLY (v3.x)
     * 
     * ref: `g3wsdk.gui.vue.Inputs.*`
     * 
     * @since 3.9.0
     */
     _legacy: {
      type: String,
      default: "",
    },

  },

  data() {
    return {
      show: true
    }
  },

  methods: {

    _addToValidate(input) {
      this.$emit('addtovalidate', input);
    },

    _removeToValidate(input){
      this.$emit('removetovalidate', input);
    },

    _changeInput(input) {
      console.log('form changed');
      this.$emit('changeinput', input);
    },

  },

  computed: {

    hasFormStructure() {
      return !!this.state.formstructure;
    },

    /**
     * Whether this is a InputG3WFormInputs component
     * 
     * @example <form-body _legacy="form-inputs" />
     * 
     * @since 3.9.0
     */
     __hasWrapper() {
      return 'form-inputs' !== this._legacy;
    },

  },

});
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
</style>