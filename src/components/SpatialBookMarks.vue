<!--
  @file
  @since v3.8
-->

<template>
  <ul
    id     = "g3w-spatial-bookmarks"
    class  = "treeview-menu g3w-spatial-bookmarks menu-items"
    :class = "{'g3w-tools': !showaddform}"
  >

    <!-- ADD NEW BOOKMARK (FORM) -->
    <li v-if = "showaddform">
      <div style = "display: flex; justify-content: end">
        <span
          v-t-tooltip:left.create  = "'close'"
          @click.stop              = "showaddform = false"
          :class                   = "g3wtemplate.getFontClass('close')"
          class                    = "sidebar-button sidebar-button-icon"
          style                    = "padding: 5px; margin: 3px;"
        ></span>
      </div>

      <helpdiv message = "sdk.spatialbookmarks.helptext" />

      <div
        class = "container add-bookmark-input"
        style = "padding: 5px; width: 100%"
      >
        <input-text ref="add_bookmark_input" :state="addbookmarkinput" />
      </div>
      <div style = "margin-top: 5px;">
        <button
          @click.stop = "addBookMark"
          class       = "sidebar-button-run btn btn-block"
          v-t         = "'add'"
          v-disabled  = "!addbookmarkinput.validate.valid"
        ></button>
      </div>
    </li>

    <!-- BOOKMARS LIST -->
    <template v-else>

      <div v-if = "is_staff" class = "content-bookmarks">
        <span v-t = "'sdk.spatialbookmarks.sections.project.title'"></span>
        <a
          :href  = "`https://docs.qgis.org/3.34/${lang}/docs/user_manual/map_views/map_view.html#bookmarking-extents-on-the-map`"
          target = "_blank"
          style  = "float: right;"
          title  = "QGIS Docs"
        >
          <i :class = "g3wtemplate.getFontClass('external-link')"></i>
        </a>
      </div>

      <template v-for = "bookmark in project.bookmarks">
        <li v-if = "bookmark.nodes">
          <div
            style       = "font-weight: bold; width: 100%;"
            :style      = "{ borderBottom: bookmark.expanded ? '2px solid #2c3b41' : 'none' }"
            @click.stop = "bookmark.expanded = !bookmark.expanded"
          >
            <span
              :class = "g3wtemplate.getFontClass(bookmark.expanded ? 'caret-down' : 'caret-right')"
              style  = "margin-right: 5px;">
            </span>
            <span>{{ bookmark.name }}</span>
          </div>
          <ul v-show = "bookmark.expanded" style = "margin-left: 10px;">
            <li v-for="node in bookmark.nodes"
              @click.stop = "gotoSpatialBookmark(node)"
              class       = "spatial-bookmark"
            >
              <div>
                <span :class = "g3wtemplate.getFontClass('bookmark')" style = "margin-right: 5px; font-size: 0.7em;"></span>
                <span class = "g3w-long-text">{{ node.name }}</span>
              </div>
            </li>
          </ul>
        </li>
        <li v-else
          @click.stop = "gotoSpatialBookmark(bookmark)"
          class       = "spatial-bookmark"
        >
          <div>
            <span :class = "g3wtemplate.getFontClass('bookmark')" style = "margin-right: 5px; font-size: 0.7em;"></span>
            <span class = "g3w-long-text">{{ bookmark.name }}</span>
          </div>
        </li>
        <spatial-book-mark-item  v-else :bookmark="bookmark" />
      </template>

      <div
        class = "content-bookmarks"
        style = "display: flex; justify-content: space-between; align-items: center; margin-top: 10px;"
      >
        <span v-t="'sdk.spatialbookmarks.sections.user.title'"></span>
        <span
          v-t-tooltip:left.create = "'add'"
          @click.stop             = "showAddForm"
          style                   = "padding: 5px; cursor: pointer;"
          class                   = "sidebar-button sidebar-button-icon"
          :class                  = "g3wtemplate.getFontClass('plus')"
        ></span>
      </div>

      <li
        v-for       = "bookmark in user.bookmarks"
        @click.stop = "gotoSpatialBookmark(bookmark)"
        class       = "spatial-bookmark"
      >
        <div>
          <span :class = "g3wtemplate.getFontClass('bookmark')" style = "margin-right: 5px; font-size: 0.7em;"></span>
          <span class = "g3w-long-text">{{bookmark.name}}</span>
        </div>
        <span
          @click.stop = "removeBookMark(bookmark.id)"
          class       = "sidebar-button sidebar-button-icon"
          style       = "color: red; margin: 5px; cursor: pointer"
        >
          <i :class = "g3wtemplate.getFontClass('trash')"></i>
        </span>
      </li>
    </template>

  </ul>
</template>

<script>
  import { LOCAL_ITEM_IDS }   from 'g3w-constants';
  import ApplicationState     from 'store/application-state'
  import GUI                  from 'services/gui';
  import Projections          from 'store/projections';
  import InputText            from "components/InputText.vue";
  import { getUniqueDomId }   from 'utils/getUniqueDomId';

  const { t }        = require('g3w-i18n');

  const item = window.localStorage.getItem(LOCAL_ITEM_IDS.SPATIALBOOKMARKS.id);
  const SPATIAL_BOOKMARKS_LOCALITEMS = item ? JSON.parse(item) : undefined;

  export default {

    /** @since 3.8.6 */
    name: 'spatial-bookmarks',

    components: {
      InputText,
    },

    data() {
      const project = ApplicationState.project;

      if (undefined === SPATIAL_BOOKMARKS_LOCALITEMS[project.getId()]) {
        SPATIAL_BOOKMARKS_LOCALITEMS[project.getId()] = [];
      }

      return {

        /**
         * true = show add dialog menu
         */
        showaddform: false,

        /**
         * spatial bookmarks saved on current QGIS project
         * 
         * bookmark is an array of Object with follow structure:
         * {
         *   name: <String> Unique identifier of spatial bootmark,
         *   removable: <Boolean> true if set in QGIS project, false if add by user on G3W-SUITE application,
         *   extent: <Array> Contain the map bbox coordinates
         * }
         */

        project: {
          bookmarks: project.state.bookmarks || []
        },

        user: {
          bookmarks: SPATIAL_BOOKMARKS_LOCALITEMS[project.getId()]
        },

        addbookmarkinput: {
          name:     'add-bookmark',
          label:    t('sdk.spatialbookmarks.input.name'),
          i18nLabel:true,
          value:    null,
          editable: true,
          type:     'varchar',
          input:    { type: 'text', options: {} },
          visible:  true,
          validate: { valid:    false, required: true }
        }
      }
    },

    computed: {

      /** @since 3.10.0 */
      is_staff() {
        return window.initConfig.user.is_staff;
      },

      /** @since 3.10.0  */
      lang() {
        return ApplicationState.language;
      },

    },

    methods: {

      addBookMark() {
        this.user.bookmarks.push({
          id:        getUniqueDomId(),
          name:      this.addbookmarkinput.value,
          extent:    GUI.getService('map').getMapExtent(),
          removable: true,
          crs:       { epsg: 1*GUI.getService('map').getCrs().split('EPSG:')[1] }
        });

        this.saveUserBookMarks();
        this.showaddform = false;
      },

      removeBookMark(id) {
        this.user.bookmarks = this.user.bookmarks.filter(b => id !== b.id);
        this.saveUserBookMarks();
      },

      saveUserBookMarks() {
        SPATIAL_BOOKMARKS_LOCALITEMS[ApplicationState.project.getId()] = this.user.bookmarks;
        try {
          window.localStorage.setItem(LOCAL_ITEM_IDS.SPATIALBOOKMARKS.id, JSON.stringify(SPATIAL_BOOKMARKS_LOCALITEMS));
        } catch(e) {
          console.warn(e);
        }
      },

      showAddForm() {
        this.addbookmarkinput.value = null;
        this.showaddform            = true;
      },

      async gotoSpatialBookmark({ extent, crs }) {
        if (crs.epsg !== GUI.getService('map').getEpsg().split('EPSG:')[1]) {
          const projection = await Projections.registerProjection(`EPSG:${crs.epsg}`);
          extent = ol.proj.transformExtent(extent, projection, GUI.getService('map').getProjection())
        }
        // make use of `force: true` parameter to get resolution from computed `extent`
        GUI.getService('map').zoomToExtent(extent, { force: true });
      },

    },

    watch: {
      async showaddform(bool) {
        if (bool) {
          await this.$nextTick();
          //need to remove all class so input is adapted to 100% width
          for (let i = 0; i < this.$refs.add_bookmark_input.$el.children.length; i++) {
            this.$refs.add_bookmark_input.$el.children[i].classList.remove('col-sm-12')
          }
        }
      }
    },

    created() {
      this.$on('close', () => this.showaddform = false);
    },

  };
</script>

<style>
  .content-bookmarks {
    font-weight: bold;
    color: #ffffff;
    padding: 5px;
    border-bottom: 1px solid #fff;
    margin-bottom: 2px;
  }

  .spatial-bookmark {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding: 5px !important;
  }
</style>