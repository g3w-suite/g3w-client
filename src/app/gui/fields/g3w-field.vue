<template>
  <component
    :is="type"
    :state="state">
  </component>
</template>

<script>

  const FieldType = {
    SIMPLE:'simple',
    GEO:'geo',
    LINK:'link',
    PHOTO: 'photo',
    PHOTOLINK: "photolink",
    IMAGE:'image',
    POINTLINK:'pointlink',
    ROUTE: 'route',
    VUE: 'vue'
  };
  const URLPattern = /^(https?:\/\/[^\s]+)/g;
  const PhotoPattern = /[^\s]+.(png|jpg|jpeg|gif)$/g;
  const Fields = require('./fields');
  export default {
    name: "g3w-field",
    props: {
      state: {
        required: true
      }
    },
    components: {
      ...Fields
    },
    computed: {
      type() {
        const value = this.state.value && typeof this.state.value === 'object' && !this.state.value.coordinates ? this.state.value.value : this.state.value;
        let type;
        if (!value) type = FieldType.SIMPLE;
        else if (value && typeof value == 'object') {
          if (value.coordinates) type = FieldType.GEO;
          else if (value.vue) {
            type = FieldType.VUE;
            this.state.value = value.value;
          }
        } else if(value && Array.isArray(value)) {
          if (value.length && value[0].photo) type = FieldType.PHOTO;
          else type = FieldType.SIMPLE
        } else if (value.toString().toLowerCase().match(PhotoPattern)) {
          type = FieldType.PHOTO;
        } else if (value.toString().match(URLPattern)) {
          type = FieldType.LINK;
        } else type = FieldType.SIMPLE;
        return `${type}_field`
      }
    }
  }
</script>

<style scoped>

</style>
