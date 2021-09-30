<template>
  <td v-if="actions.length" class="g3w-feature-actions">
    <action v-for="action in actions" :key="action.id" v-bind="$props":action="action">
    </action>
  </td>
</template>

<script>
  import Action from './action.vue';
  export default {
    name: "actions",
    props: {
      featureIndex: {
        type: Number
      },
      feature: {
        type: Object
      },
      layer: {
        type: Object
      },
      trigger: {
        type: Function
      },
      actions: {
        type: Array,
        default: []
      },
    },
    components: {
      action: Action
    }
  }
</script>

<style scoped>

</style>