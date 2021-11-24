<template>
  <div style="display: flex; flex-direction: column">
    <label :for="id" style="display: block" v-t="label"></label>
    <input :id="id" ref="range-input" @change="change" v-model="value" type="range" :min="min" :max="max" :step="step">
  </div>
</template>

<script>
  export default {
    name: "range",
    props:{
      id: {
        required: true,
      },
      label: {
        type:"String",
        default: ''
      },
      min: {
        type: Number,
        default: 0
      },
      max:{
        type: Number,
        default: 10
      },
      step:{
        type: Number,
        default: 1
      },
      labelValue: {}
    },
    data(){
      return {
        value: 0
      }
    },
    methods:{
      changeBackGround(value){
        this.$refs['range-input'].style.backgroundSize = (value - this.min) * 100 / (this.max - this.min) + '% 100%';
      },
      setValue(value){
        this.changedValue(value);
      },
      changedValue(value){
        this.value = value;
        this.changeBackGround(value);
        this.$emit('change-range', {
          id: this.id,
          value
        });
      },
      change(evt){
        const value = 1*evt.target.value;
        this.changedValue(value);
      }
    },
    watch:{
      value(value){
        this.changedValue(value)
      }
    },
    created(){},
    async mounted(){
      await this.$nextTick();
      this.changeBackGround(this.value);
    },
    beforeDestroy() {}
  }
</script>

<style scoped>

</style>