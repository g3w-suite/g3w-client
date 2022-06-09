<template>
  <component
    :is="type"
    :feature="feature"
    :state="state">
  </component>
</template>

<script>
  import fieldsService  from 'gui/fields/fieldsservice';
  import Fields  from './fields';
  export default {
    name: "g3w-field",
    props: {
      state: {
        required: true
      },
      feature: {
        type: Object
      }
    },
    components: {
      ...Fields
    },
    created(){
      this.type = fieldsService.getType(this.state)
    }
  }
</script>

<style scoped>

</style>
