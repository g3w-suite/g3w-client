<!--
  @file
  
  ORIGINAL SOURCE: src/components/GlobalRange.vue@3.8

  @since 3.9.0
-->

<template>
  <g3w-input :state="{ visible: true, type: 'range_slider' }" _legacy="g3w-input" _plain="true">
    <template #default>
      <div>
        <section class="global-range">

          <section>
            <b class="min-max-label">{{min}}</b>
            <b>{{unit}}</b>
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
              v-model = "value"
              :id     = "id"
              :min    = "min"
              :max    = "max"
              :step   = "step"
            >
          </div>

          <section>
            <b class="min-max-label">{{max}}</b>
            <b>{{unit}}</b>
          </section>

        </section>

        <template v-if="showValue">
          <span>{{value}}</span>
          <b>{{unit}}</b>
        </template>

      </div>
    </template>
  </g3w-input>
</template>

<script>
  const { debounce } = require('core/utils/utils');

  export default {

    /** @since 3.9.0 */
    name: "input-range-slider",

    props:{

      /**
       * ID value for label.
       */
      id: {
        required: true,
      },

      /**
       * @TODO find out what changes from the `unit` props
       */
      label: {
        type: String,
        default: ''
      },

      /**
       * Min range slider value.
       */
      min: {
        type: Number,
        default: 0
      },

      /**
       * Max range slider value.
       */
      max: {
        type: Number,
        default: 10
      },

      /**
       * Range slider step.
       */
      step: {
        type: Number,
        default: 1
      },

      /**
       * @TODO appears to be unused, if so please remove.
       */
      labelValue: {},

      /**
       * Current range value.
       */
      value: {
        default: 0
      },

      /**
       * Whether to emit the `changed` event.
       */
      sync: {
        type: Boolean,
        default: false
      },

      /**
       * Whether display current range value.
       */
      showValue: {
        type: Boolean,
        default: false
      },

      /**
       * Range unit.
       */
      unit: {
        type: String,
        default: ''
      }

    },

    data() {
      return {};
    },

    methods: {

      changeBackGround(value) {
        this.$refs['range-input'].style.backgroundSize = `${value ? (value - this.min) * 100 / (this.max - this.min): 0}% 100%`;
      },

      setValue(value) {
        this.changedValue(value);
      },

      /**
       * @param event.target
       */
      change({ target }) {
        this.changedValue(1 * target.value);
      },

      emitChangeValue(value) {
        this.value = value;
        this.$emit('change-range', { value, id: this.id });
      },

    },

    watch: {

      value(value) {
        this.changeBackGround(value);
        this.sync && this.emitChangeValue(value);
      },

    },

    created() {
      if (this.sync) {
        this.changedValue = () => this.$emit('changed');
      } else {
        this.changedValue = debounce(value => { this.emitChangeValue(value) });
      }
    },

    async mounted() {
      await this.$nextTick();
      this.changeBackGround(this.value);
    },

    beforeDestroy() {},

  }
</script>

<style scoped>
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