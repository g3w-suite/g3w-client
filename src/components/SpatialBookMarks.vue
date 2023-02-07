<template>
  <ul id="g3w-spatial-bookmarks" class="treeview-menu g3w-spatial-bookmarks g3w-tools menu-items" v-if="show">
    <template v-if="add">
      <li>
        <helpdiv message="sdk.spatialbookmarks.helptext"></helpdiv>
        <div style="padding: 5px;">
          <button class="sidebar-button-run btn btn-block" v-t="'add'"></button>
        </div>
      </li>
    </template>
    <template v-else>
      <spatial-book-mark-item v-for="spatialbookmark in spatialbookmarks.project" :bookmark="spatialbookmark"/>
      <spatial-book-mark-item v-for="spatialbookmark in spatialbookmarks.user" :bookmark="spatialbookmark"/>
    </template>
  </ul>
</template>

<script>
  import ProjectsRegistry from 'store/projects';
  import SpatialBookMarkItem from "components/SpatialBookMarkItem.vue";

  export default {
    data() {
      return {
        add: false, // property to show or not add dialog menu
        /** spatialbookmark is an array of Object with follow structure:
         * {
         *   name: <String> Unique identifier of spatial bootmark,
         *   removable: <Boolean> true if set in QGIS project, false if add by user on G3W-SUITE application,
         *   extent: <Array> Contain the map bbox coordinates
         * }
         */
        spatialbookmarks: {
          project: ProjectsRegistry.getCurrentProject().getSpatialBookmarks(),
          user: [{
            name: 'Test',
            removable: true,
            extent: [1252097.387694235,5433142.813076063,1252149.7035237015,5433203.120668952]
          }]
        }
      }
    },
    components: {
      SpatialBookMarkItem
    },
    computed: {
      show(){
        return this.spatialbookmarks.user.length > 0;
      }
    },
    methods: {
      addBookMark(){
        this.$emit('add');
        this.add = true;
        setTimeout(()=> {
          this.add = false
        }, 2000)
      }
    },
    async mounted() {}
  };
</script>

<style scoped>
</style>