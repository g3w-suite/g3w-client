<!--
  @file
  @since v3.7
-->

<template>
  <td
    v-if="actions.length"
    style="padding: 3px"
    class="g3w-feature-actions skin-background-color lighten"
    :colspan="colspan">
    <action v-for="action in actions" :key="action.id" v-bind="$props" :action="action"/>
  </td>
</template>

<script>
  import Action from 'components/QueryResultsAction.vue';

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
      colspan: {
        type: Number
      }
    },
    components: {
      action: Action
    }
  }
</script>

<style scoped>
  .g3w-feature-actions {
    padding: 3px;

  }
</style>
