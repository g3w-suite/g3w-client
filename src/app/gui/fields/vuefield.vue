<template>
  <field :state="state">
    <div slot="field">
      <component :value="state.value" :is="state.vueoptions.component"></component>
    </div>
  </field>
</template>

<script>
  import Field from './field.vue';
  export default {
    name: "vuefield",
    props: {
      state: {
        type: Object,
        default: {
          value: null,
          vueoptions: {
            component: {}
          }
        }
      }
    },
    components: {
      Field
    }
  }
</script>

<style scoped>

</style>