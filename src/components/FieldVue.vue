<!--
  @file
  @since v3.7
-->

<template>
  <field :state = "state">
    <div slot = "field">
      <component
        :feature = "feature"
        :value   = "state.value"
        :is      = "state.vueoptions.component"/>
    </div>
  </field>
</template>

<script>
import Field from 'components/Field.vue';

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