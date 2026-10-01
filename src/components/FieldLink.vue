<!--
  @file
  @since v3.7
-->

<template>
  <div class = "field g3w-field">
    <div v-if = "state.showlabel" class = "field_label">{{ state.label }}</div>
    <div class = "field_value">
      <button
        class       = "btn skin-button field_link"
        @click.stop = "openLink(value)"
        :title      = "value"
      >{{ $t('Open') }}</button>
    </div>
  </div>
</template>

<script>
export default {

  /** @since 3.8.6 */
  name: "field-link",

 props: {
    state: { 
      required: true, 
      type:     Object 
    }
  },
  
  data() {
    return {
      value: null,
    }
  },
  methods: {
    openLink(link_url) {
      window.open(link_url, '_blank');
    }
  },
  created() {
    this.value = this.state?.value?.value ?? this.state.value;
  }
};
</script>

<style scoped>
  .field_link {
    max-width: 100%;
  }
</style>
