<!--
  @file

  ORIGINAL SOURCE: src/mixins/widget.js@3.8
  ORIGINAL SOURCE: src/components/InputCheckbox.vue@3.8

  @since 3.9.0
-->

<template>
  <g3w-field :state="state">

    <!-- 
      @example <g3w-field mode="input" _type="checkbox" />
     -->
    <template #input-body="{ tabIndex, editable, notvalid }">
      <div
        v-disabled  = "!editable"
        style       ="height: 20px; margin-top:8px;"
      >
        <input
          @change   = "changeCheckBox"
          :tabIndex = "tabIndex"
          style     = "width: 100%"
          :class    = "{ 'input-error-validation' : notvalid }"
          class     = "magic-checkbox"
          v-model   = "value"
          type      = "checkbox"
          :id       = "id"
        >
        <label :for="id">{{ label }}</label>
      </div>
    </template>

  </g3w-field>
</template>

<script>
import G3WField           from 'components/G3WField.vue';
import { getUniqueDomId } from 'utils/getUniqueDomId';

Object
    .entries({
      G3WField,
      getUniqueDomId,
    })
    .forEach(([k, v]) => console.assert(undefined !== v, `${k} is undefined`));

export default {

  /** @since 3.8.6 */
  // name:'input-checkbox',

  components: {
    'g3w-field': G3WField,
  },

  props: {
    state: {
      type: Object,
      required: true,
    },
  },

  data() {
    return {
      value:   null,
      label:   null,
      changed: false,
      id:      getUniqueDomId(),
    }
  },

  watch: {

    /**
     * ORIGINAL SOURCE: src/mixins/widget.js@3.8
     */
    'state.value'(value) {
      if (this.changed) {
        this.changed = false;
      } else {
        this.stateValueChanged(value);
      } 
    },

  },

  methods: {

    /**
     * convert label.
     * 
     * ORIGINAL SOURCE: src/app/gui/inputs/checkbox/service.js@3.8::convertCheckedToValue(checked)
     */
    setLabel() {
      const service   = this.$parent.getInputService();
      const checked   = this._hasValue(this.value) ? this.value : false;
      const { value } = service.getState().input.options.values.find(d => checked === d.checked);
  
      service._setValue(value);
  
      this.label = service.getValue();
    },

    /**
     * ORIGINAL SOURCE: src/app/gui/inputs/checkbox/service.js@3.8::convertValueToChecked()
     */
    setValue() {
      const service = this.$parent.getInputService();
      const value   = service.getValue();

      if (!this._hasValue(value)) {
        return false;
      }

      let option = service.getState().input.options.values.find(d => value === d.value);

      if (undefined === option) {
        option           = service.getState().input.options.values.find(value => false === value.checked);
        service._setValue(option.value);
      }

      this.value = option.checked;
    },

    /**
     * Check if a variable is not `null` or `undefined` (nullish coalescing values)
     * 
     * @since 3.9.0 
     */
    _hasValue(value) {
      return null !== value && undefined !== value;
    },

    changeCheckBox() {
      this.setLabel();
      this.widgetChanged();
    },

    stateValueChanged() {
      this.setValue();
      this.setLabel();
    },

    /**
     * ORIGINAL SOURCE: src/mixins/widget.js@3.8
     */
    widgetChanged() {
      this.changed = true;
      this.$parent.change();
    },

  },

  created() {
    this.value = this.state.forceNull
      ? this.value
      : this.setValue();
  },

  mounted() {
    if (!this.state.forceNull) {
      this.setLabel();
    }
  },

};
</script>