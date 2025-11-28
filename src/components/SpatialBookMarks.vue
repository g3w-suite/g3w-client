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
    <template>

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
        <spatial-book-mark-item  v-else :bookmark = "bookmark" />
      </template>

      <div
        class = "content-bookmarks"
        style = "display: flex; justify-content: space-between; align-items: center; margin-top: 10px;"
      >
        <span :hidden = "is_mobile" v-t = "'User Bookmarks'"></span>
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
          <span class = "g3w-long-text">{{ bookmark.name }}</span>
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

  const gid              = ApplicationState.project.getId();
  const SAVED_BOOKMARKS  = JSON.parse(window.localStorage.getItem('SPATIALBOOKMARKS') || '{}');

  function setUserBookMarks() {
    SAVED_BOOKMARKS[gid] = SAVED_BOOKMARKS[gid] || [];
    window.localStorage.setItem('SPATIALBOOKMARKS', JSON.stringify(SAVED_BOOKMARKS || '{}'));
  }

    export default {

    /** @since 3.8.6 */
    name: 'spatial-bookmarks',

    components: {
      InputText,
    },

    data() {
      setUserBookMarks();

      return {
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

      removeBookMark(id) {
        this.user.bookmarks = SAVED_BOOKMARKS[gid] = SAVED_BOOKMARKS[gid].filter(b => id !== b.id);
        setUserBookMarks();
      },

      showAddForm() {
        GUI.showUserMessage({
          type:      'tool',
          size:      'small',
          title:     'User Bookmarks',
          iconClass: 'bookmark',
          hooks: {
            body: Vue.extend({
              template: /*html */`
                <div style = "padding: 5px;">
                  <!-- HELP DIV -->
                  <section style = "color: #000; text-align: justify; position: relative; border-radius: 3px; margin: 5px 2px 5px 2px; white-space: pre-line; background-color: #eee !important;">
                    <span style = "text-align: center; font-size: 0.7em; margin-top: -4px; margin-left: -4px; background-color: #eee; font-weight: bold; color: #000; position: absolute; top: 0; left: 0; width: 15px; height: 15px; border: 1px solid #fff; border-radius: 50%;">i</span>
                    <div v-t = "'Move on map extent, insert name and click Add'" style = "max-height: 200px; padding: 10px; overflow-y: auto;"></div>
                  </section>
                  <section>
                    <label for = "add-bokmark">{{ $t('Name') }} *</label>
                    <input 
                      id      = "add-bookmark" 
                      type    = "text" 
                      class   = "form-control" 
                      v-model = "addbookmarkinput" 
                      required/>
                    <button 
                      v-disabled  = "!addbookmarkinput"
                      style       = "color: #fff; margin-top: 20px; background-color: var(--skin-color)" 
                      class       = "btn btn-block"
                      @click.stop = "addBookMark">{{ $t('add') }}
                    </button>
                  </section>  
                </div>
              `,
              data() {
                return {
                  addbookmarkinput: null,
                }
              },
              methods: {
                addBookMark() {
                  SAVED_BOOKMARKS[gid].push({
                    id:        getUniqueDomId(),
                    name:      this.addbookmarkinput,
                    extent:    GUI.getMapExtent(),
                    removable: true,
                    crs:       { epsg: 1 * GUI.getCrs().split('EPSG:')[1] }
                  });

                  setUserBookMarks();
                  GUI.closeUserMessage();
                },
              },

            })
          }
        })
        
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

  #add-bookmark:user-invalid {
    outline: 2px solid red;
  }
</style>