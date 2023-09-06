<!--
  @file
  @since v3.7
-->

<template>
  <g3w-field :state="state">
    <template #field>
      <button
        class  = "btn skin-button field_link"
        v-t    = "'info.link_button'"
        @click = "openLink(value)"
      ></button>
    </template>
  </g3w-field>
</template>

<script>
export default {

  /** @since 3.8.6 */
  name: "field-link",

  props: ['state'],

  data() {
    return {
      value: null,
    };
  },

  methods: {

    openLink(link_url) {
      window.open(link_url, '_blank');
    },

  },

  created() {
    this.value = (this.state.value && 'object' === typeof this.state.value)
      ? this.state.value.value
      : this.state.value;
  },

};
</script>

<style scoped>
  .field_link {
    max-width: 100%;
  }
</style>
