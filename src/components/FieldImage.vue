<!--
  @file
  @since v3.7
-->

<template>
  <field :state = "state">
    <div slot = "field" style = "text-align: left">
      <img
        v-for       = "(value, index) in values"
        class       = "img-responsive"
        style       = "max-height:50px"
        alt         = ""
        @click.stop = "showGallery(index)"
        :src        = "getSrc(value)"/>
      <g3w-images-gallery :id = "galleryId" :active = "active" :images = "getGalleryImages()"/>
    </div>
  </field>
</template>

<script>
import Field from 'components/Field.vue';

const { toRawType } = require('utils');

export default {

  /** @since 3.8.6 */
  name: "field-image",

  props: ['state'],
  data() {
    return {
      galleryId: `gallery_${Date.now()}`,
      active:     null,
      value:      this.state.value.mime_type !== undefined ? this.state.value.value : this.state.value
    }
  },
  components: {
    Field
  },
  computed: {
    values() {
      return Array.isArray(this.value) ? this.value : [this.value];
    }
  },
  methods: {
    getSrc(value) {
      return toRawType(value) === 'Object' ? value.photo: value;
    },
    showGallery(index) {
      this.active = index;
      if (toRawType(this.value) === 'Object') this.value.active = true;
      $(`#${this.galleryId}`).modal('show');
    },
    getGalleryImages() {
      return this.values.map(image => ({src: this.getSrc(image)}));
    }
  }
};
</script>

<style scoped>
  .img-responsive {
    cursor: pointer;
  }
</style>
