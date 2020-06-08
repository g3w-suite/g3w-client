<template>
  <field :state="state">
    <div slot="field" style="text-align: left">
      <img v-for="(value, index) in values" class="img-responsive" style="max-height:50px" @click="showGallery(index)" :src="getSrc(value)"/>
      <gallery :id="galleryId" :active="active" :images="getGalleryImages()"></gallery>
    </div>
  </field>
</template>

<script>
  import Field from './field.vue';
  import Gallery from './gallery.vue'
  export default {
    name: "image",
    props: ['state'],
    data() {
      return {
        galleryId: 'gallery_' + Date.now(),
        active: null,
        value: this.state.value.mime_type !== undefined ? this.state.value.value : this.state.value
      }
    },
    components: {
      Gallery,
      Field
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
        $('#'+this.galleryId).modal('show');
      },
      getGalleryImages() {
        const images = [];
        this.values.forEach((image) => {
          images.push({
            src: this.getSrc(image)
          })
        });
        return images
      }
    }
  }
</script>

<style scoped>
  .img-responsive {
    cursor: pointer;
  }

</style>
