<!--
  @file
  @since v3.7
-->

<template>
  <field :state="state">
    <div
      slot  = "field"
      style = "text-align: left"
    >
      <img
        v-for  = "(value, index) in values"
        class  = "img-responsive"
        style  = "max-height: 50px"
        @click = "showGallery(index)"
        :src   = "getSrc(value)"
      />
      <g3w-images-gallery
        :id     = "galleryId"
        :active = "active"
        :images = "getGalleryImages()"
      />
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
      active:    null,
      value:     undefined !== this.state.value.mime_type  ? this.state.value.value : this.state.value,
    };
  },

  components: {
    Field
  },

  computed: {

    values() {
      return Array.isArray(this.value) ? this.value : [this.value];
    },

  },

  methods: {

    getSrc(value) {
      return 'Object' === toRawType(value) ? value.photo: value;
    },

    showGallery(index) {
      this.active = index;
      if ('Object' === toRawType(this.value)) {
        this.value.active = true;
      }
      $(`#${this.galleryId}`).modal('show');
    },

    getGalleryImages() {
      return this.values.map(img => ({ src: this.getSrc(img) }));
    },

  },

};
</script>

<style scoped>
  .img-responsive {
    cursor: pointer;
  }
</style>
