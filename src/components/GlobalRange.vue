<!--
  @file
  @since v3.7
-->

<template>
  <div>
    <section style="display: flex; justify-content: space-between; font-weight: bold;">
      <section style="align-self: flex-end">
        <span class="min-max-label">{{min}}</span>
        <span style="font-weight: bold;">{{unit}}</span>
      </section>

      <div style="display: flex; flex-direction: column; margin: 0 3px">
        <label
          :for="id"
          style="display: block"
          class="skin-color"
          v-t="label"
        ></label>
        <input
          type="range"
          ref="range-input"
          @change="change"
          v-model="state.value"
          :id="id"
          :min="min"
          :max="max"
          :step="step"
        >
      </div>

      <section style="align-self: flex-end">
        <span class="min-max-label">{{max}}</span>
        <span style="font-weight: bold;">{{unit}}</span>
      </section>

    </section>
    <template v-if="showValue">
      <span>{{state.value}}</span>
      <span style="font-weight: bold;">{{unit}}</span>
    </template>
  </div>
</template>

<script>
  const { debounce, uniqueId } = require('utils');

  export default {
    name: "range",
    props:{

      /**
       * ID value for label.
       */
      id: {
        // type: String,
        default: undefined,
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
    data(){
      return {
        state: { value: this.value }
      };
    },
    methods:{
      changeBackGround(value){
        this.$refs['range-input'].style.backgroundSize = `${value ? (value - this.min) * 100 / (this.max - this.min): 0}% 100%`;
      },
      setValue(value){
        this.changedValue(value);
      },
      change(evt){
        const value = 1*evt.target.value;
        this.changedValue(value);
      },
      emitChangeValue(value){
        this.state.value = value;
        this.$emit('change-range', {
          id: this.id,
          value
        });
      }
    },
    watch:{
      'state.value'(value) {
        this.changeBackGround(value);
        this.sync && this.emitChangeValue(value);
      }
    },
    created(){
      this.changedValue =  this.sync ? ()=> this.$emit('changed') : debounce(value => {
        this.emitChangeValue(value)
      })
    },
    async mounted(){
      await this.$nextTick();
      this.changeBackGround(this.value);
    },
    beforeDestroy() {}
  }
</script>

<style scoped>
  .min-max-label {
    align-self: end;
    font-weight: bold;
  }
</style>