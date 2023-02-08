<template>
  <ul
    id="g3w-spatial-bookmarks"
    class="treeview-menu g3w-spatial-bookmarks menu-items"
    :class="{'g3w-tools': !showaddform}"
  >
    <template v-if="showaddform">

      <li>
        <div style="display: flex; justify-content: end">

          <span
            v-t-tooltip:left.create="'close'"
            @click.stop="showaddform = false"
            :class="g3wtemplate.getFontClass('close')"
            class="sidebar-button sidebar-button-icon"
            style="padding: 5px; margin: 3px;"
          >
          </span>

        </div>

        <helpdiv message="sdk.spatialbookmarks.helptext"/>
        <div
          class="container"
          style="padding: 5px; width: 100%"
        >
          <input-text
            :state="addbookmarkinput"/>
        </div>
        <div style="margin-top: 5px;">
          <button
            @click.stop="addBookMark"
            class="sidebar-button-run btn btn-block"
            v-t="'add'"
            v-disabled="!addbookmarkinput.validate.valid"></button>
        </div>
      </li>
    </template>
    <template v-else>
      <div class="content-bookmarks">
        <span v-t="'sdk.spatialbookmarks.sections.project.title'"></span>
      </div>
      <template v-for="bookmark in project.bookmarks">
        <spatial-book-mark-group
          v-if="bookmark.nodes"
          :group="bookmark"/>
        <spatial-book-mark-item v-else :bookmark="bookmark"/>
      </template>
      <div
        class="content-bookmarks"
        style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">

        <span
          style="font-weight: bold; color: #ffffff"
          v-t="'sdk.spatialbookmarks.sections.user.title'">
        </span>

        <span
          @click.stop="showaddform = true"
          style="padding: 5px; cursor: pointer;"
          class="sidebar-button sidebar-button-icon"
          :class="g3wtemplate.getFontClass('plus')"
        >
        </span>
      </div>
      <spatial-book-mark-item
        @remove-bookmark="removeBookMark"
        v-for="bookmark in user.bookmarks"
        :bookmark="bookmark"/>
    </template>
  </ul>
</template>

<script>
  import {LOCALITEMSIDS} from 'app/constant';
  import GUI from 'services/gui';
  import ApplicationService from 'services/application';
  import ProjectsRegistry from 'store/projects';
  import SpatialBookMarkGroup from "components/SpatialBookMarkGroup.vue";
  import SpatialBookMarkItem from "components/SpatialBookMarkItem.vue";
  import InputText from "components/InputText.vue";

  const { uniqueId } = require('core/utils/utils');

  const SPATIAL_BOOKMARKS_LOCALITEMS = ApplicationService.getLocalItem(LOCALITEMSIDS.SPATIALBOOKMARKS.id);

  export default {
    components: {
      SpatialBookMarkGroup,
      SpatialBookMarkItem,
      InputText,
    },
    data() {
      if ("undefined" === typeof SPATIAL_BOOKMARKS_LOCALITEMS[ProjectsRegistry.getCurrentProject().getId()]) {
        SPATIAL_BOOKMARKS_LOCALITEMS[ProjectsRegistry.getCurrentProject().getId()] = []
      }
      return {
        showaddform: false, // property to show or not add dialog menu
        /** bookmark is an array of Object with follow structure:
         * {
         *   name: <String> Unique identifier of spatial bootmark,
         *   removable: <Boolean> true if set in QGIS project, false if add by user on G3W-SUITE application,
         *   extent: <Array> Contain the map bbox coordinates
         * }
         */

        project: {
          show: true,
          bookmarks: ProjectsRegistry.getCurrentProject().getSpatialBookmarks()
        },
        user: {
          show: true,
          bookmarks: SPATIAL_BOOKMARKS_LOCALITEMS[ProjectsRegistry.getCurrentProject().getId()]
        },
        addbookmarkinput: {
          name: 'add-bookmark',
          label: 'Name',
          value: null,
          editable: true,
          type: 'varchar',
          input: {
            type: 'text',
            options: {}
          },
          visible: true,
          validate: {
            valid: false,
            required: true
          }
        }
      }
    },
    methods: {
      addBookMark(){
        this.user.bookmarks.push({
          id: uniqueId(),
          name: this.addbookmarkinput.value,
          extent: GUI.getService('map').getMapExtent(),
          removable: true,
          crs:{
            epsg: 1*GUI.getService('map').getCrs().split('EPSG:')[1]
          }
        });
        this.saveUserBookMarks();
        this.showaddform = false;
      },
      removeBookMark(id){
        this.user.bookmarks = this.user.bookmarks.filter(bookmark => bookmark.id !== id);
        this.saveUserBookMarks();
      },
      saveUserBookMarks(){
        SPATIAL_BOOKMARKS_LOCALITEMS[ProjectsRegistry.getCurrentProject().getId()] = this.user.bookmarks;
        ApplicationService.setLocalItem({
          id: LOCALITEMSIDS.SPATIALBOOKMARKS.id,
          data: SPATIAL_BOOKMARKS_LOCALITEMS
        });
      }
    },
    created(){
      this.$on('close', ()=>{
        this.showaddform = false
      })
    },
    async mounted() {}
  };
</script>

<style scoped>
  .content-bookmarks {
    font-weight: bold;
    color: #ffffff;
    padding: 5px;
    border-bottom: 2px solid #ffffff;
    margin-bottom: 5px;
  }
</style>