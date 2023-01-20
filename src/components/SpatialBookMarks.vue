<template>
  <ul id="g3w-spatial-bookmarks" class="treeview-menu g3w-spatial-bookmarks g3w-tools menu-items" v-if="show">
    <template v-if="add">
      <li>
        <helpdiv message="sdk.spatialbookmarks.helptext"></helpdiv>
        <div>
          <button class="sidebar-button-run btn btn-block" v-t="'add'"></button>
        </div>
      </li>
    </template>
    <template v-else>
      <li v-for="spatialbookmark in spatialbookmarks" @click.stop="gotoSpatialBookmark(spatialbookmark)" class="spatial-bookmark">
        <span>{{spatialbookmark.name}}</span>
        <span v-if="spatialbookmark.removable">
        <i :class="g3wtemplate.getFontClass('trash')"></i>
      </span>
      </li>
    </template>
  </ul>
</template>

<script>
  import GUI from 'services/gui';

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
        spatialbookmarks: [{
          name: 'Test',
          removable: true,
          extent: [1252097.387694235,5433142.813076063,1252149.7035237015,5433203.120668952]
        }]
      }
    },
    components: {
    },
    computed: {
      show(){
        return this.spatialbookmarks.length > 0;
      }
    },
    methods: {
      addBookMark(){
        this.add = true;
        setTimeout(()=> {
          this.add = false
        }, 2000)
      },
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
    justify-content: space-between;
  }
</style>