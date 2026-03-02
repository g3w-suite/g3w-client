<!--
  @file
  @since v3.7
-->

<template>
  <div
    v-if  = "value"
    class = "preview" >
    <a :href = "value" target = "_blank">
      <div class = "previewtype" :class = "type">
        <i class = "fa-2x" :class = "g3wtemplate.font[type]"></i>
      </div>
    </a>
    <div class = "filename">{{ filename }}</div>
    <slot></slot>
  </div>
</template>

<script>
import mediaMixin from 'mixins/media';

export default {
  name: "g3w-media",
  mixins: [ mediaMixin ],
  props: {
    state: {
      type: Object,
      default: {
        value:     null,
        mime_type: null,
      }
    }
  },
  computed: {
    type() {
      return this.getMediaType(this.state.mime_type).type;
    },
    value() {
      return this.state.value;
    }
  }
};
</script>

<style scoped>

</style>
