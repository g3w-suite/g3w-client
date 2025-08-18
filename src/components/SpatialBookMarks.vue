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
          v-t-tooltip:left = "'close'"
          @click.stop      = "showaddform = false"
          :class           = "$fa('close')"
          class            = "sidebar-button sidebar-button-icon"
          style            = "padding: 5px; margin: 3px;"
        ></span>
      </div>
      

      <!-- HELP DIV -->
      <div style = " color: #FFF; text-align: justify; position: relative; border-radius: 3px; margin: 5px 2px 5px 2px; white-space: pre-line; background-color: #384246 !important;">
        <span style = "text-align: center; font-size: 0.7em; margin-top: -4px; margin-left: -4px; background-color: var(--bgcolor); font-weight: bold; color: #fff; position: absolute; top: 0; left: 0; width: 15px; height: 15px; border: 1px solid #fff; border-radius: 50%;">i</span>
        <div v-t = "'Move on map extent, insert name and click Add'" style = "max-height: 200px; padding: 10px; overflow-y: auto;"></div>
      </div>

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
        <span :hidden = "is_mobile" v-t = "'Project Bookmarks'"></span>
        <a
          :hidden          = "is_mobile"
          :href            = "`https://docs.qgis.org/3.34/${lang}/docs/user_manual/map_views/map_view.html#bookmarking-extents-on-the-map`"
          target           = "_blank"
          style            = "float: right;"
          data-i18n-title  = "QGIS Docs"
          data-placement   = "right"
        >
          <i :class = "$fa('external-link')"></i>
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
              :class = "$fa(bookmark.expanded ? 'caret-down' : 'caret-right')"
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
                <span :class = "$fa('bookmark')" style = "margin-right: 5px; font-size: 0.7em;"></span>
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
            <span :class = "$fa('bookmark')" style = "margin-right: 5px; font-size: 0.7em;"></span>
            <span class = "g3w-long-text">{{ bookmark.name }}</span>
          </div>
        </li>
        <spatial-book-mark-item  v-else :bookmark="bookmark" />
      </template>

      <div
        class = "content-bookmarks"
        style = "display: flex; justify-content: space-between; align-items: center; margin-top: 10px;"
      >
        <span :hidden = "is_mobile" v-t="'User Bookmarks'"></span>
        <span
          :hidden          = "is_mobile"
          v-t-tooltip:left = "'add'"
          @click.stop      = "showAddForm"
          style            = "padding: 5px; cursor: pointer;"
          class            = "sidebar-button sidebar-button-icon"
          :class           = "$fa('plus')"
        ></span>
      </div>

      <li
        v-for       = "bookmark in user.bookmarks"
        @click.stop = "gotoSpatialBookmark(bookmark)"
        class       = "spatial-bookmark"
      >
        <div>
          <span :class = "$fa('bookmark')" style = "margin-right: 5px; font-size: 0.7em;"></span>
          <span class = "g3w-long-text">{{bookmark.name}}</span>
        </div>
        <span
          @click.stop = "removeBookMark(bookmark.id)"
          class       = "sidebar-button sidebar-button-icon"
          style       = "color: red; margin: 5px; cursor: pointer"
        >
          <i :class = "$fa('trash')"></i>
        </span>
      </li>
    </template>

  </ul>
</template>

<script>
  import ApplicationState   from 'g3w-state'
  import GUI                from 'g3w-app';
  import InputText          from 'components/InputText.vue';
  import { getUniqueDomId } from 'utils/getUniqueDomId';
  import { gettext as _ }   from 'g3w-i18n';

    export default {

    /** @since 3.8.6 */
    name: 'spatial-bookmarks',

    components: {
      InputText,
    },

    data() {
      const gid             = ApplicationState.project.getId();
      const SAVED_BOOKMARKS = JSON.parse(window.localStorage.getItem('SPATIALBOOKMARKS') || '{}');
      SAVED_BOOKMARKS[gid]  = SAVED_BOOKMARKS[gid] || [];
      window.localStorage.setItem('SPATIALBOOKMARKS', JSON.stringify(SAVED_BOOKMARKS || '{}'));

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
          bookmarks: ApplicationState.project.state.bookmarks || []
        },

        user: {
          bookmarks: SAVED_BOOKMARKS[gid]
        },

        addbookmarkinput: {
          name:     'add-bookmark',
          label:    _('Name'),
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

      /** @since 4.0.0 */
      is_mobile() {
        return window.innerWidth < 767;
      }

    },

    methods: {

      addBookMark() {
        this.user.bookmarks.push({
          id:        getUniqueDomId(),
          name:      this.addbookmarkinput.value,
          extent:    GUI.getMapExtent(),
          removable: true,
          crs:       { epsg: 1 * GUI.getCrs().split('EPSG:')[1] }
        });

        this.saveUserBookMarks();
        this.showaddform = false;
      },

      removeBookMark(id) {
        this.user.bookmarks = this.user.bookmarks.filter(b => id !== b.id);
        this.saveUserBookMarks();
      },

      saveUserBookMarks() {
        const gid             = ApplicationState.project.getId();
        const SAVED_BOOKMARKS = JSON.parse(window.localStorage.getItem('SPATIALBOOKMARKS') || '{}');
        SAVED_BOOKMARKS[gid]  = this.user.bookmarks || [];
        window.localStorage.setItem('SPATIALBOOKMARKS', JSON.stringify(SAVED_BOOKMARKS || '{}'));
      },

      showAddForm() {
        this.addbookmarkinput.value = null;
        this.showaddform            = true;
      },

      async gotoSpatialBookmark({ extent, crs }) {
        // automatically hide sidebar on mobile
        if (window.innerWidth < 767) {
          GUI.hideSidebar();
        }
        if (crs.epsg !== GUI.getEpsg().split('EPSG:')[1]) {
          const projection = await ApplicationState.projections.set(`EPSG:${crs.epsg}`);
          extent = ol.proj.transformExtent(extent, projection, GUI.getProjection())
        }
        // make use of `force: true` parameter to get resolution from computed `extent`
        GUI.zoomToExtent(extent, { force: true });
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