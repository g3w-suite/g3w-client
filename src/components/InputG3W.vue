<!--
  @file
  @since v3.7
-->

<template>
  <div v-if = "state.visible">

    <div v-if = "state.type !== 'child'">
      <component
        @changeinput      = "changeInput"
        :changeInput      = "changeInput"
        @addinput         = "addToValidate"
        :addToValidate    = "addToValidate"
        @removeinput      = "removeToValidate"
        :removeToValidate = "removeToValidate"
        :state            = "state"
        :is               = "type">
      </component>
      <divider/>
    </div>

    <div
      v-else
      style = "border-top: 2px solid"
      class = "skin-border-color field-child"
    >
      <h4 style = "font-weight: bold">{{ state.label}}</h4>
      <div> {{ state.description }} </div>
      <g3w-input v-for = "field in state.fields" :key = "field.name"
        :state="field"
        @changeinput      = "changeInput"
        :changeInput      = "changeInput"
        @addinput         = "addToValidate"
        :addToValidate    = "addToValidate"
        @removeinput      = "removeToValidate"
        :removeToValidate = "removeToValidate"/>
    </div>
  </div>
</template>

<script>
  import { InputsComponents as Inputs } from 'g3w-input';

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
      removeToValidate:{
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
  };
</script>
