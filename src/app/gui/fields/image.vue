<template>
  <field :state="state">
    <div slot="field" style="text-align: left">
      <img v-for="(value, index) in values" class="img-responsive" style="max-height:50px" @click="showGallery(index)" :src="getSrc(value)"/>
      <g3w-images-gallery :id="galleryId" :active="active" :images="getGalleryImages()"></g3w-images-gallery>
    </div>
  </field>
</template>

<script>
  import Field from './field.vue';
  import utils  from 'core/utils/utils';
  export default {
    name: "image",
    props: ['state'],
    data() {
      return {
        galleryId: `gallery_${Date.now()}`,
        active: null,
        value: this.state.value.mime_type !== undefined ? this.state.value.value : this.state.value
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
        return utils.toRawType(value) === 'Object' ? value.photo: value;
      },
      showGallery(index) {
        this.active = index;
        if (utils.toRawType(this.value) === 'Object') this.value.active = true;
        $(`#${this.galleryId}`).modal('show');
      },
      getGalleryImages() {
        return this.values.map(image => ({src: this.getSrc(image)}));
      }
    }
  }
</script>

<style scoped>
  .img-responsive {
    cursor: pointer;
  }

</style>
