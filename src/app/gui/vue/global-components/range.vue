<template>
 <input @change="change" :value="value" type="range" :min="min" :max="max" :step="step">
</template>

<script>
  export default {
    name: "range",
    props:{
      min: {
        default: 0
      },
      max:{
        default: 1
      },
      step:{
        default: 0.1
      },
      value: {
        default: 0
      }
    },
    methods:{
     changeBackGround(value){
      this.$el.style.backgroundSize = (value - this.min) * 100 / (this.max - this.min) + '% 100%';
     },
     change(evt){
      const value = evt.target.value;
      this.changeBackGround(value);
      this.$emit('change', value);
     }
    },
    mounted(){
     this.changeBackGround(this.value);
    }
  }
</script>

<style scoped>

</style>