<template>
  <div class="preview" v-if="value">
    <a :href="value" target="_blank">
      <div class="previewtype" :class="type">
        <i class="fa-2x" :class="g3wtemplate.font[type]"></i>
      </div>
    </a>
    <div class="filename">{{ filename }}</div>
    <slot></slot>
  </div>
</template>

<script>
  const {mediaMixin:MediaMixin} = require('gui/vue/vue.mixins');
  export default {
    name: "g3w-media",
    mixins: [MediaMixin],
    props: ['state'],
    computed: {
      type() {
        return this.getMediaType(this.state.mime_type).type;
      },
      value() {
        return this.state.value
      }
    }
  }
</script>

<style scoped>

</style>
