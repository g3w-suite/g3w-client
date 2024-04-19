<!--
  @file
  @since v3.7
-->

<template>
  <div class="container-fluid">
    <div class="row">
      <div
        v-for="(value, index) in values"
        class="g3w-image col-md-6 col-sm-12"
      >
        <img
          class       = "img-thumbnail"
          @click.stop = "showGallery(index)"
          :src        = "getSrc(value)"/>
      </div>
    </div>
    <g3w-images-gallery
      :id     = "galleryId"
      :active = "active"
      :images = "getGalleryImages()"/>
  </div>
</template>

<script>
  import Gallery from 'components/GlobalGallery.vue'

  export default {
    name: "g3w-image",
    props: {
      value: {}
    },
    data() {
      return {
        galleryId: `gallery_${Date.now()}`,
        active:     null
      }
    },
    components: {
      'g3w-images-gallery': Gallery
    },
    computed: {
      values() {
        return Array.isArray(this.value) ? this.value : [this.value];
      }
    },
    methods: {
      getSrc(value) {
        if (typeof value === 'object') {
          return value.photo;
        }
        return value
      },
      showGallery(index) {
        this.active = index;
        if (typeof this.value === 'object') {
          this.value.active = true;
        }
        $(`#${this.galleryId}`).modal('show');
      },
      getGalleryImages() {
        return this.values.map(image => ({ src: this.getSrc(image) }));
      }
    },
  }
</script>

<style scoped>
  .img-responsive {
    cursor: pointer;
  }
  .g3w-image{
    padding-left: 0 !important;
    min-width: 100px;
    max-width: 100%;
    cursor:pointer;
  }

</style>