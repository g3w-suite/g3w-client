<!--
  @file
  @since v3.8
-->

<template>
  <ul
    id     = "g3w-spatial-bookmarks"
    class  = "treeview-menu g3w-spatial-bookmarks menu-items g3w-tools"
  >

    <!-- BOOKMARS LIST -->
    <li v-if = "is_staff" class = "content-bookmarks" style = "display: flex; justify-content: space-between; background: transparent; border-radius: 0;cursor: unset;">
      <span :hidden = "is_mobile" v-t = "'Project Bookmarks'"></span>
      <a
        :hidden         = "is_mobile"
        :href           = "`https://docs.qgis.org/3.34/${lang}/docs/user_manual/map_views/map_view.html#bookmarking-extents-on-the-map`"
        target          = "_blank"
        data-i18n-title = "QGIS Docs"
        data-placement  = "right"
        style           = "padding: 5px 0;"
      >
        <i :class = "$fa('external-link')"></i>
      </a>
    </li>

    <template v-for = "bookmark in project_bookmarks">
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
          <li v-for = "node in bookmark.nodes"
            @click.stop = "gotoSpatialBookmark(node)"
            class       = "spatial-bookmark"
          >
            <div style = "display: flex; width: 100%; align-items: baseline;">
              <span :class = "$fa('bookmark')" style = "margin-right: 5px; font-size: 0.7em;"></span>
              <span class  = "g3w-long-text">{{ node.name }}</span>
              <span 
                @click.stop     = "shareBookmark(node)" 
                v-t-tooltip:top = "'Share via link'" 
                :class          = "$fa('share-alt')" style = "margin-left: auto; padding: 5px;"
                class           = "sidebar-button sidebar-button-icon">
              </span>
            </div>
          </li>
        </ul>
      </li>
      <li v-else
        @click.stop = "gotoSpatialBookmark(bookmark)"
        class       = "spatial-bookmark"
      >
        <div style = "display: flex; width: 100%; align-items: baseline;">
          <span :class = "$fa('bookmark')" style = "margin-right: 5px; font-size: 0.7em;"></span>
          <span class  = "g3w-long-text">{{ bookmark.name }}</span>
          <span 
            @click.stop     = "shareBookmark(bookmark)" 
            v-t-tooltip:top = "'Share via link'" 
            :class          = "$fa('share-alt')" style = "margin-left: auto; padding: 5px;"
            class           = "sidebar-button sidebar-button-icon">
          </span>
        </div>
      </li>
    </template>

    <li
      class = "content-bookmarks"
      style = "display: flex; justify-content: space-between; align-items: center; margin-top: 10px;background: transparent; border-radius: 0;cursor: unset;"
    >
      <span :hidden = "is_mobile" v-t = "'User Bookmarks'"></span>
      <span
        :hidden          = "is_mobile"
        v-t-tooltip:left = "'add'"
        @click.stop      = "showAddForm"
        style            = "padding: 5px; font-size: 1.2em; cursor: pointer;"
        class            = "sidebar-button sidebar-button-icon"
        :class           = "$fa('plus-square')"
      ></span>
      <!-- ADD NEW BOOKMARK (FORM) -->
      <dialog ref = "add_bookmark" @beforetoggle = "onBeforetoggle">
        <div style = "display: flex; justify-content: end">
          <button
            type        = "button"
            title       = "close"
            @click.stop = "showaddform = false"
            class       = "fas fa-times"
            style       = "border: medium;line-height: 1;font-weight: 700;font-size: 15px;background: none;width: 40px;height: 40px;"
          ></button>
        </div>
        <form @submit.prevent = "addBookMark">
          <label for = "add-bokmark">{{ $t('Name of new spatial bookmark') }} *</label>
          <input id = "add-bookmark" type = "text" required class = "form-control" ref="add_bookmark_input" v-model = "addbookmarkinput" />
          <button type = "submit" class = "btn btn-block btn-success" style = "margin-top: 20px;">{{ $t('add') }}</button>
        </form>
        
      </dialog>
    </li>

    <li
      v-for       = "bookmark in user_bookmarks"
      @click.stop = "gotoSpatialBookmark(bookmark)"
      class       = "spatial-bookmark"
    >
      <div>
        <span :class = "$fa('bookmark')" style = "margin-right: 5px; font-size: 0.7em;"></span>
        <span class = "g3w-long-text">{{ bookmark.name }}</span>
        
      </div>
      <div style = "cursor: pointer">
        <span 
          @click.stop     = "shareBookmark(bookmark)"     
          v-t-tooltip:top = "'Share via link'" 
          :class          = "$fa('share-alt')" 
          class           = "sidebar-button sidebar-button-icon" 
          style           = "margin-right: 5px; padding: 5px;">
        </span>

        <span 
          @click.stop     = "removeBookMark(bookmark.id)" 
          v-t-tooltip:top = "'Delete'" 
          :class          = "$fa('trash')" 
          class           = "sidebar-button sidebar-button-icon" 
          style           = "color: red; padding: 5px;">
        </span>
      </div>
    </li>

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

        project_bookmarks: ApplicationState.project.state.bookmarks || [],

        user_bookmarks: SAVED_BOOKMARKS[gid],

        addbookmarkinput: null,
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

    watch: {
      async showaddform(bool) {
        // remove all "col-sm-12" classes so input is adapted to 100% width
        if (bool) {
          this.$refs.add_bookmark.showModal();
        } else {
          this.$refs.add_bookmark.close();
        }
      },
    },

    methods: {

      /**
       * @param bookmark @since 4.1.0
       */
      async shareBookmark({ extent, crs }) {
        await this.gotoSpatialBookmark({ extent, crs });
        GUI.getPermalink(new URL(window.location.href), {});
      },

      addBookMark() {
        this.user_bookmarks.push({
          id:        getUniqueDomId(),
          name:      this.addbookmarkinput,
          extent:    GUI.getMapExtent(),
          removable: true,
          crs:       { epsg: 1 * GUI.getCrs().split('EPSG:')[1] }
        });

        this.saveUserBookMarks();
        this.showaddform = false;
      },

      removeBookMark(id) {
        this.user_bookmarks = this.user_bookmarks.filter(b => id !== b.id);
        this.saveUserBookMarks();
      },

      saveUserBookMarks() {
        const gid             = ApplicationState.project.getId();
        const SAVED_BOOKMARKS = JSON.parse(window.localStorage.getItem('SPATIALBOOKMARKS') || '{}');
        SAVED_BOOKMARKS[gid]  = this.user_bookmarks || [];
        window.localStorage.setItem('SPATIALBOOKMARKS', JSON.stringify(SAVED_BOOKMARKS || '{}'));
      },

      showAddForm() {
        this.addbookmarkinput = null;
        this.showaddform      = true;
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
        await GUI.zoomToExtent(extent, { force: true });
      },

      /**
       * @since 4.1.0
       */
      onBeforetoggle(e) {
        if ('closed' === e.newState) {
          this.showaddform = false;
        }
      },

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

  .spatial-bookmark:hover {
    background-color: var(--bgcolor) !important;
  }

  #add-bookmark:user-invalid {
    outline: 2px solid red;
  }
</style>