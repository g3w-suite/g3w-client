<template>
  <div>
    <spatial-book-mark-item></spatial-book-mark-item>
  </div>
</template>

<script>
  import SpatialBookMarkItem from "components/SpatialBookMarkItem.vue";

  export default {
    props: {
      bookmark: {
        type: Object,
        required: true,
        default: {
          name: '',
        }
      }
    },
    components: {
      SpatialBookMarkItem
    },
    methods: {},
    async mounted() {}
  };
</script>

<style scoped>
</style>