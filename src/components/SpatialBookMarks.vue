<!--
  @file List and navigate to spatial bookmarks.
  @since v3.8
-->

<template>
  <ul
    id     = "g3w-spatial-bookmarks"
    class  = "treeview-menu menu-items"
  >

    <!-- BOOKMARS LIST -->
    <li v-if = "is_staff" class = "content-bookmarks" style = "display: flex; justify-content: space-between; background: transparent; border-radius: 0;cursor: unset;">
      <span>{{ $t('Project Bookmarks') }}</span>
      <a
        :href           = "`https://docs.qgis.org/3.34/${lang}/docs/user_manual/map_views/map_view.html#bookmarking-extents-on-the-map`"
        target          = "_blank"
        :aria-label     = "$t('QGIS Docs')"
        data-i18n-title = "QGIS Docs"
        data-placement  = "right"
        style           = "padding: 5px 0;"
      >
        <i aria-hidden = "true" class = "fa fa-external-link-alt"></i>
      </a>
    </li>

    <template v-for = "bookmark in project_bookmarks">
      <li v-if = "bookmark.nodes">
        <details>
          <summary>{{ bookmark.name }}</summary>
          <ul style = "margin-left: 10px;">
            <li v-for = "node in bookmark.nodes"
              @click.stop         = "gotoSpatialBookmark(node)"
              @keydown.enter.self.stop = "gotoSpatialBookmark(node)"
              @keydown.space.self.prevent.stop = "gotoSpatialBookmark(node)"
              class               = "spatial-bookmark"
              role                = "button"
              tabindex            = "0"
            >
              <i class = "fas fa-bookmark" aria-hidden = "true" style = "margin-right: 5px; font-size: 0.7em;"></i>
              <span class = "g3w-long-text">{{ node.name }}</span>
              <button
                type           = "button"
                @click.stop    = "shareBookmark(node)" 
                title          = "Share via link"
                :aria-label    = "$t('Share via link')"
                data-placement = "top"
                style          = "margin-left: auto; padding: 5px;"
                class          = "map-theme-action"
              >
                <i aria-hidden="true" class = "fa fa-share-alt"></i>
              </button>
            </li>
          </ul>
        </details>
      </li>
      <li v-else
        @click.stop         = "gotoSpatialBookmark(bookmark)"
        @keydown.enter.self.stop = "gotoSpatialBookmark(bookmark)"
        @keydown.space.self.prevent.stop = "gotoSpatialBookmark(bookmark)"
        class               = "spatial-bookmark"
        role                = "button"
        tabindex            = "0"
      >
        <i class = "fas fa-bookmark" aria-hidden = "true" style = "margin-right: 5px; font-size: 0.7em;"></i>
        <span class  = "g3w-long-text">{{ bookmark.name }}</span>
        <button
          type           = "button"
          @click.stop    = "shareBookmark(bookmark)" 
          title          = "Share via link"
          :aria-label    = "$t('Share via link')"
          data-placement = "top"
          class          = "map-theme-action"
          style          = "margin-left: auto; padding: 5px;"
        >
          <i aria-hidden="true" class = "fa fa-share-alt"></i>
        </button>
      </li>
    </template>

    <li
      class = "content-bookmarks"
      style = "display: flex; justify-content: space-between; align-items: center; margin-top: 10px;background: transparent; border-radius: 0;cursor: unset;"
    >
      <span>{{ $t('User Bookmarks') }}</span>
      <button
        type        = "button"
        title       = "add"
        :aria-label = "$t('add')"
        @click.stop = "showAddForm"
        class       = "map-theme-add"
        style       = "padding: 5px; font-size: 1.2em;"
      >
        <i aria-hidden="true" class = "fas fa-plus-square"></i>
      </button>
      <!-- ADD NEW BOOKMARK (FORM) -->
      <dialog ref = "add_bookmark" data-tool-dialog :aria-label = "$t('Name of new spatial bookmark')" @beforetoggle = "onBeforetoggle" @close = "onAddBookmarkClose">
        <div style = "display: flex; justify-content: end">
          <button
            type        = "button"
            title       = "close"
            :aria-label = "$t('close')"
            @click.stop = "showaddform = false"
            class       = "fas fa-times"
            style       = "border: medium;line-height: 1;font-weight: 700;font-size: 15px;background: none;width: 40px;height: 40px;"
          ></button>
        </div>
        <form @submit.prevent = "addBookMark">
          <label for = "add-bookmark">{{ $t('Name of new spatial bookmark') }} *</label>
          <input id = "add-bookmark" type = "text" required class = "form-control" ref="add_bookmark_input" v-model = "addbookmarkinput" />
          <button type = "submit" class = "btn btn-block btn-success" style = "margin-top: 20px;">{{ $t('add') }}</button>
        </form>
        
      </dialog>
    </li>

    <li
      v-for               = "bookmark in user_bookmarks"
      @click.stop         = "gotoSpatialBookmark(bookmark)"
      @keydown.enter.self.stop = "gotoSpatialBookmark(bookmark)"
      @keydown.space.self.prevent.stop = "gotoSpatialBookmark(bookmark)"
      class               = "spatial-bookmark"
      role                = "button"
      tabindex            = "0"
    >
      <i class = "fas fa-bookmark" aria-hidden = "true" style = "margin-right: 5px; font-size: 0.7em;"></i>
      <span class = "g3w-long-text">{{ bookmark.name }}</span>
      <button
        type           = "button"
        @click.stop    = "shareBookmark(bookmark)"
        title          = "Share via link"
        :aria-label    = "$t('Share via link')"
        data-placement = "top"
        style          = "margin-left: auto; margin-right: 5px; padding: 5px;"
        class          = "map-theme-action"
      >
        <i aria-hidden="true" class = "fa fa-share-alt"></i>
      </button>

      <button
        type            = "button"
        @click.stop     = "removeBookMark(bookmark.id)" 
        title           = "Delete"
        :aria-label     = "$t('delete')"
        data-placement  = "top"
        class           = "map-theme-action map-theme-delete"
        style           = "padding: 5px;"
      >
        <i aria-hidden="true" class = "fas fa-trash"></i>
      </button>
    </li>

  </ul>
</template>

<script>
  import ApplicationState   from 'g3w-state'
  import GUI                from 'g3w-app';
  import { getUniqueDomId } from 'utils/getUniqueDomId';
  import { gettext as _ }   from 'g3w-i18n';

    export default {

    /** @since 3.8.6 */
    name: 'spatial-bookmarks',

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

    },

    watch: {
      async showaddform(bool) {
        // remove all "col-sm-12" classes so input is adapted to 100% width
        if (bool) {
          GUI.showToolDialog(this.$refs.add_bookmark);
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
        this.$el.closest('.bookmarks-dialog')?.close();
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

      onAddBookmarkClose(event) {
        const dialog = this.$el.closest('.bookmarks-dialog');
        if (dialog && 'replace' !== event.target.returnValue) {
          GUI.showToolDialog(dialog);
          GUI.getComponent('spatialbookmarks').setOpen(true);
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
    color: inherit;
    padding: 5px;
    border-bottom: 1px solid #52636b;
    margin-bottom: 2px;
  }

  .bookmarks-dialog #g3w-spatial-bookmarks,
  .bookmarks-dialog #g3w-spatial-bookmarks ul {
    display: block;
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .spatial-bookmark {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    justify-content: space-between;
    padding: 5px !important;
  }

  .spatial-bookmark:hover {
    background-color: #f0f4f5;
  }

  .spatial-bookmark:focus-visible {
    outline: 2px solid #245b67;
    outline-offset: 2px;
  }

  #add-bookmark:user-invalid {
    outline: 2px solid red;
  }

  ul#g3w-spatial-bookmarks > li > details > *                     { padding: 5px; }
  ul#g3w-spatial-bookmarks > li > details > summary               { user-select: none; }
  ul#g3w-spatial-bookmarks > li > details       > summary::marker { content: "\f0da\a0\a0"; font-family: "Font Awesome 5 Free"; font-weight: 900; }
  ul#g3w-spatial-bookmarks > li > details[open] > summary::marker { content: "\f0d7\a0\a0"; }
  ul#g3w-spatial-bookmarks > li > details[open] > summary         { border-bottom: 2px solid #2c3b41; }
</style>