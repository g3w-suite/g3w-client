<template>
  <div>
    <div v-if="state.type !== 'child'">
      <component
        @changeinput="changeInput"
        @addinput="addToValidate"
        :addToValidate="addToValidate"
        :changeInput="changeInput"
        :state="state"
        :is="type">
      </component>
      <span class="divider"></span>
    </div>
    <div v-else style="border-top: 2px solid" class="skin-border-color field-child">
      <h4 style="font-weight: bold">{{ state.label}}</h4>
      <div> {{ state.description }} </div>
      <g3w-input v-for="field in state.fields" :key="field.name"
        :state="field"
        @changeinput="changeInput"
        @addinput="addToValidate"
        :addToValidate="addToValidate"
        :changeInput="changeInput">
      </g3w-input>
    </div>
  </div>
</template>

<script>
  const Inputs = require('./inputs');
  export default {
    name: "g3w-input",
    props: {
      state: {
        required: true
      },
      addToValidate:{
        type: Function,
        required: true
      },
      changeInput: {
        type: Function,
        required: true
      }
    },
    components: {
      ...Inputs
    },
    computed: {
      type() {
        if (this.state.type !== 'child')
          return this.state.input.type ? `${this.state.input.type}_input`: `${this.state.type}_input`;
      }
    },
    created() {
      //TEMPORARY
      if (this.state.type !== 'child' && !this.state.input.options)
        this.state.input.options = {};
    }
  }
</script>

<style scoped>

</style>
