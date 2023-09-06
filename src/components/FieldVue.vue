<!--
  @file
  @since v3.7
-->

<template>
  <g3w-field :state="state">
    <template #field>
      <div>
        <component
          :feature = "feature"
          :value   = "state.value"
          :is      = "state.vueoptions.component"
        />
      </div>
    </template>
  </g3w-field>
</template>

<script>
export default {

  name: "vuefield",

  props: {

    feature: {
      type: Object
    },

    state: {
      type: Object,
      default: {
        value: null,
        vueoptions: {
          component: {},
        },
      },
    },

  },

};
</script>