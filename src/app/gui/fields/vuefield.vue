<template>
  <field :state="state">
    <div slot="field">
      <component :is="state.value.value"></component>
    </div>
  </field>
</template>

<script>
  import Field from './field.vue';
  export default {
    name: "vuefield",
    props: ['state'],
    components: {
      Field
    }
  }
</script>

<style scoped>

</style>