<!--
  @file
  @since v3.7
-->

<template>
  <field :state = "state">
    <button
      slot        = "field"
      class       = "btn skin-button field_link"
      @click.stop = "openLink(value)"
      :title      = "value"
    >{{ $t('Open') }}</button>
  </field>
</template>

<script>
import Field from 'components/Field.vue';

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
  components: {
    Field
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
