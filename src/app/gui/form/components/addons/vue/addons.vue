<template>
  <span class="form-addons">
    <add-on
      :id="addon.id"
      :title="addon.title"
      :fnc="addon.fnc"
      :fontClass="addon.fontClass" v-for="addon in addons" :key="addon.id"></add-on>
  </span>

</template>

<script>
  import AddOn from './addon.vue';
  export default {
    name: "addons",
    props: {
      addons: {
        type: Array,
        required: false,
        default: []
      }
    },
    components: {
      AddOn
    }
  }
</script>

<style scoped>

</style>
