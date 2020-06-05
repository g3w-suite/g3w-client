<template>
  <form class="form-horizontal g3w-form">
    <div class="box-primary">
      <div class="box-body">
          <template v-for="field in state.fields">
            <g3w-input
              :state="field"
              :addToValidate="addToValidate"
              :changeInput="changeInput"
              @addToValidate="addToValidate"
              @changeInput="changeInput">
            </g3w-input>
          </template>
      </div>
    </div>
  </form>
</template>

<script>
  import G3wInput from './g3w-input.vue'
  export default {
    name: "g3w-form-inputs",
    props: [
      'state',
      'addToValidate',
      'changeInput'
    ],
    components: {
      G3wInput
    }
  }
</script>

<style scoped>

</style>
