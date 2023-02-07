<template>
  <li @click.stop="gotoSpatialBookmark(bookmark)" class="spatial-bookmark">
     <span v-if="bookmark.removable" style="color: red; margin: 5px" class="sidebar-button sidebar-button-icon">
      <i :class="g3wtemplate.getFontClass('trash')"></i>
    </span>
    <span style="font-weight: bold">{{bookmark.name}}</span>
  </li>
</template>

<script>
  import GUI from 'services/gui';

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
    methods: {
      removeBookMark(){},
      gotoSpatialBookmark({extent}){
        GUI.getService('map').zoomToExtent(extent)
      }
    },
    async mounted() {}
  };
</script>

<style scoped>
  .spatial-bookmark {
    display: flex;
    align-items: baseline;
  }
</style>