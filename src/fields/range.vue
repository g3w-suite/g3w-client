<!--
  @file
  
  ORIGINAL SOURCE: src/components/GlobalRange.vue@3.8
  ORIGINAL SOURCE: src/components/InputRange.vue@3.8
  ORIGINAL SOURCE: src/components/InputSliderRange.vue@3.8

  @since 3.9.0
-->

<template>
  <g3w-field :state="state">

    <!--
      ORIGINAL SOURCE: src/components/GlobalRange.vue@3.8

      @example <g3w-field mode="input" _type="range" />
    -->
    <template v-if="'range_slider' == _type" #default>
      <div>
        <section class="global-range">

          <section>
            <b class="min-max-label">{{ min }}</b>
            <b>{{ unit }}</b>
          </section>

          <div>
            <label
              :for   = "id"
              style  = "display: block"
              class  = "skin-color"
              v-t    = "label"
            ></label>
            <input
              type    = "range"
              ref     = "range-input"
              @change = "change"
              v-model = "state.value"
              :id     = "id"
              :min    = "min"
              :max    = "max"
              :step   = "step"
            >
          </div>

          <section>
            <b class="min-max-label">{{ max }}</b>
            <b>{{ unit }}</b>
          </section>

        </section>

        <template v-if="showValue">
          <span>{{ value }}</span>
          <b>{{ unit }}</b>
        </template>

      </div>
    </template>

    <template v-else #input-body="{ change, tabIndex, editable, notvalid }">
      <!--
        ORIGINAL SOURCE: src/components/InputRange.vue@3.8

        @example <g3w-field mode="read" _type="number" />
      -->
      <input
        v-if = "'number' == _type"
        @keydown.69.prevent = ""
        @keydown.13.stop    = ""
        @change             = "checkValue"
        @blur               = "checkValue"
        class               = "form-control g3w-input-range"
        :class              = "{ 'input-error-validation' : notvalid }"
        :tabIndex           = "tabIndex"
        v-disabled          = "!editable"
        v-model             = "state.value"
        type                = "number"
        :step               = "step"
      >
      <!--
        ORIGINAL SOURCE: src/components/InputSliderRange.vue@3.8
      -->
      <div v-else>
        <span style="font-weight: bold">{{ state.value }}</span>
        <input
          @change    = "change"
          class      = "g3w-input-range"
          :class     = "{ 'input-error-validation' : notvalid }"
          :tabIndex  = "tabIndex"
          v-disabled = "!editable"
          v-model    = "state.value"
          :min       = "min"
          :max       = "max"
          type       = "range"
          :step      = "step"
        >
      </div>

    </template>

  </g3w-field>
</template>

<script>
import G3WField     from 'components/G3WField.vue';
import { debounce } from 'utils/debounce';

Object
    .entries({
      G3WField,
      debounce,
    })
    .forEach(([k, v]) => console.assert(undefined !== v, `${k} is undefined`));

export default {

  /** @since 3.8.6 */
  // name: 'input-range',

  components: {
    'g3w-field': G3WField,
  },

  data() {

    this.state = this.$attrs.state || {
      input: {
        options: {
          values: [undefined !== this.$attrs.value ? this.$attrs.value : 0 ],
          min:    [undefined !== this.$attrs.min   ? this.$attrs.min   : 0 ],
          max:    [undefined !== this.$attrs.max   ? this.$attrs.max   : 10],
          Step:   [undefined !== this.$attrs.step  ? this.$attrs.step  : 1],
        },
      },
    };

    const { min, max, Step:step } = this.state.input.options.values[0];

    return {
      min,
      max,
      step,
      value:     this.state.value,
      unit:      $attrs.unit      || '',
      id:        $attrs.id        || undefined,
      label:     $attrs.label     || '',
      showValue: $attrs.showValue || false,
    };
  },

  props: {

    // state: {
    //   type: Object,
    //   default: {},
    //   // required: true,
    // },

    /**
     * ID value for label.
     * 
     * ORIGINAL SOURCE: src/components/GlobalRange.vue@3.8
     * 
     * @since 3.9.0
     */
    // id: {
    //   required: true,
    // },

    /**
     * ORIGINAL SOURCE: src/components/GlobalRange.vue@3.8
     * 
     * @TODO find out what changes from the `unit` props
     * 
     * @since 3.9.0
     */
    // label: {
    //   type: String,
    //   default: ''
    // },

    /**
     * Min range slider value.
     * 
     * ORIGINAL SOURCE: src/components/GlobalRange.vue@3.8
     * 
     * @since 3.9.0
     */
    // min: {
    //   type: Number,
    //   default: 0
    // },

    /**
     * Max range slider value.
     * 
     * ORIGINAL SOURCE: src/components/GlobalRange.vue@3.8
     * 
     * @since 3.9.0
     */
    // max: {
    //   type: Number,
    //   default: 10
    // },

    /**
     * Range slider step.
     * 
     * ORIGINAL SOURCE: src/components/GlobalRange.vue@3.8
     * 
     * @since 3.9.0
     */
    // step: {
    //   type: Number,
    //   default: 1
    // },

    /** 
     * ORIGINAL SOURCE: src/components/GlobalRange.vue@3.8
     * 
     * @TODO appears to be unused, if so please remove.
     * 
     * @since 3.9.0
     */
    // labelValue: {},

    /**
     * Current range value.
     * 
     * ORIGINAL SOURCE: src/components/GlobalRange.vue@3.8
     * 
     * @since 3.9.0
     */
    // value: {
    //   default: 0
    // },

    /**
     * Whether to emit the `changed` event.
     * 
     * ORIGINAL SOURCE: src/components/GlobalRange.vue@3.8
     * 
     * @since 3.9.0
     */
    // sync: {
    //   type: Boolean,
    //   default: false
    // },

    /**
     * Whether display current range value.
     * 
     * ORIGINAL SOURCE: src/components/GlobalRange.vue@3.8
     * 
     * @since 3.9.0
     */
    // showValue: {
    //   type: Boolean,
    //   default: false
    // },

    /**
     * Range unit.
     * 
     * ORIGINAL SOURCE: src/components/GlobalRange.vue@3.8
     * 
     * @since 3.9.0
     */
    // unit: {
    //   type: String,
    //   default: ''
    // },

  },

  computed: {

    __isGlobalRange() {
      return undefined === this.$attrs.state;
    },

  },

  methods: {

    checkValue() {
      // check if value of input is empty
      const isEmpty = _.isEmpty(_.trim(this.state.value));

      // in case not required check if value is empty and set default value
      if (isEmpty && !this.state.validate.required) {
        this.state.value = this.state.input.options.values[0].default;
      }

      // if state required initial value is false
      this.state.validate.valid = !this.state.validate.required;

      // if is not empty check validity from validator
      if (!isEmpty) {
        this.state.validate.valid = this.$parent.getInputService().getValidator().validate(this.state.value);
      }

      this.$parent.change();
    },

    /**
     * ORIGINAL SOURCE: src/components/GlobalRange.vue@3.8
     * 
     * @since 3.9.0
     */
    changeBackGround(value) {
      if (this.$refs['range-input']) {
        this.$refs['range-input'].style.backgroundSize = `${value ? (value - this.min) * 100 / (this.max - this.min): 0}% 100%`;
      }
    },

    /**
     * ORIGINAL SOURCE: src/components/GlobalRange.vue@3.8
     * 
     * @since 3.9.0
     */
    setValue(value) {
      this.changedValue(value);
    },

    /**
     * ORIGINAL SOURCE: src/components/GlobalRange.vue@3.8
     * 
     * @param event.target
     * 
     * @since 3.9.0
     */
    change({ target }) {
      this.changedValue(1 * target.value);
    },

    /**
     * ORIGINAL SOURCE: src/components/GlobalRange.vue@3.8
     * 
     * @since 3.9.0
     */
    emitChangeValue(value) {
      this.value = value;
      this.$emit('change-range', { value, id: this.id });
    },

    /**
     * ORIGINAL SOURCE: src/app/gui/inputs/sliderrange/service.js@3.8::changeInfoMessage()
     * 
     * @since 3.9.0
     */
     _updateInfoMessage() {
      const service      = this.$parent.getInputService();
      const { min, max } = service.getState().input.options;
      service.setInfo(`[MIN: ${min} - MAX: ${max}]`);
    },

  },

  watch: {

    /**
     * ORIGINAL SOURCE: src/components/GlobalRange.vue@3.8
     * 
     * @since 3.9.0
     */
    value(value) {
      this.changeBackGround(value);

      if ($attrs.sync) {
        this.emitChangeValue(value);
      } 
    },

    /**
     * ORIGINAL SOURCE: src/components/InputSliderRange.vue@3.8
     * 
     * @since v3.9.0
     */
    min() {
      this._updateInfoMessage();
    },

    /**
     * ORIGINAL SOURCE: src/components/InputSliderRange.vue@3.8
     * 
     * @since v3.9.0
     */
    max() {
      this._updateInfoMessage();
    },

  },

  /**
   * ORIGINAL SOURCE: src/components/GlobalRange.vue@3.8
   * 
   * @since 3.9.0
   */
  created() {
    if (this.$attrs.sync) {
      this.changedValue = () => this.$emit('changed');
    } else {
      this.changedValue = debounce(value => { this.emitChangeValue(value) });
    }
  },

  /**
   * ORIGINAL SOURCE: src/components/GlobalRange.vue@3.8
   * 
   * @since 3.9.0
   */
  async mounted() {
    await this.$nextTick();
    this.changeBackGround(this.value);
  },

};
</script>

<style scoped>
  .g3w-input-range {
    width: 100%;
    padding-right: 5px;
  }
  .min-max-label {
    align-self: end;
  }
  .global-range {
    display: flex;
    justify-content: space-between;
    font-weight: bold;
  }
  .global-range > section {
    align-self: flex-end;
  }
  .global-range > section + div {
    display: flex;
    flex-direction: column;
    margin: 0 3px;
  }
</style>