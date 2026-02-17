<!--
  @file
  @since v3.7
-->

<template>
  <ul class = "sidebar-menu">
    <li
      id    = "g3w-catalog-toc-views"
      class = "treeview sidebaritem skin-border-color"
    >

      <a href = "#" class = "g3w-map-theme-anchor">
        <section @click.stop = "toggle">
          <i :class = "$fa(collapsed ? 'caret-down' : 'caret-up')" style = "padding: 3px;"></i>
          <i :class = "$fa(collapsed ? 'eye-close' : 'eye')"       style = "padding: 0 0 0 4px;"></i>
          <!-- Text of current theme -->
          <span
            v-if  = "active_theme.theme"
            class = "current_map_theme treeview-label g3w-long-text"
          >
            <span v-t:pre = "'THEME'">:</span>
            <span class = "skin-color" style = "font-size: 1.1em;">{{ active_theme.theme }}</span>
          </span>
          <!-- Choose a theme -->
          <b
            v-else
            class = "treeview-label"
            v-t   = "'CHOOSE THEME'">
          </b>
        </section>
      </a>

      <!-- ADD NEW MAP THEME (FORM) -->
      <div
        v-if  = "show_form"
        class = "add-map-theme skin-border-color"
      >
        <div style="display: flex; justify-content: end; padding-top: 5px;">
          <span
            v-t-tooltip:left = "'close'"
            @click.stop      = "show_form = false"
            :class           = "$fa('close')"
            class            = "sidebar-button sidebar-button-icon"
            style            = "padding: 2px; margin: 2px;"
          ></span>
        </div>
        <div class = "container add-map-theme-input">
          <input-text
            ref    = "add_map_theme_input"
            :state = "custom_theme"
          />
        </div>
        <div style = "margin-top: 5px;">
          <button
            class       = "sidebar-button-run btn btn-block"
            v-t         = "'add'"
            @click.stop = "saveTheme"
            v-disabled  = "!custom_theme.validate.valid">
          </button>
        </div>
      </div>
      <ul
        v-else
        id     = "g3w-catalog-views"
        :class = "{'menu-open': !collapsed}"
      >
        <!-- LIST PROJECT MAP THEME -->
        <li
          v-if = "(map_themes.project || []).length > 0"
          id   = "g3w-catalog-views-project"
        >
          <ul style = "padding: 0">
            <li>
              <div
                v-t   = "'Project Themes'"
                class = "project_map_theme">
              </div>
            </li>
            <li style = "padding: 5px 5px 5px 17px;">
              <div
                v-for = "(map_theme, i) in map_themes.project"
                :key  = "map_theme.theme"
              >
                <label
                  :for  = "`g3w-map_theme-${i}`"
                >
                  <input
                    type     = "radio"
                    name     = "radio"
                    :id      = "`g3w-map_theme-${i}`"
                    :value   = "map_theme.theme"
                    v-model  = "active_theme.theme"
                  />
                  <span class = "g3w-long-text">{{ map_theme.theme }}</span>
                </label>
              </div>
            </li>
          </ul>
        </li>
        <!-- LIST USER MAP THEME -->
        <li
          v-if = "logged"
          id   = "g3w-catalog-views-user"
        >
          <ul style = "padding: 0">
            <li>
              <div class = "user_map_theme">
                <span v-t = "'User Themes'"></span>
                <!-- Add theme button -->
                <span
                  v-t-tooltip:left = "'add'"
                  @click.stop      = "show_form = !show_form"
                  :class           = "$fa('plus')"
                  class            = "action sidebar-button sidebar-button-icon"
                  style            = "margin-left: auto; padding: 5px;"
                >
                </span>
              </div>
            </li>
            <!-- DELETE THEME -->
            <li style = "padding: 5px 5px 5px 17px">
              <div
                v-for = "(map_theme, i) in map_themes.custom"
                :key  = "map_theme.theme"
                style = "display: flex; justify-content: space-between;"
              >
                <span>
                  <label :for = "`g3w-map_theme-${i}-user`">
                    <input
                      type     = "radio"
                      name     = "radio"
                      :id      = "`g3w-map_theme-${i}-user`"
                      :value   = "map_theme.theme"
                      v-model  = "active_theme.theme"
                    />
                    <span class = "g3w-long-text">{{ map_theme.theme }}</span>
                  </label>
                </span>
                <span class = "g3w-custom-map-theme-tools">
                 <span
                   @click.stop     = "updateTheme(map_theme.theme)"
                   class           = "action sidebar-button sidebar-button-icon"
                   style           = "padding: 5px;"
                   v-t-tooltip:top = "'update'"
                   v-disabled      = "active_theme.theme !== map_theme.theme"
                 >
                  <i
                    :class = "$fa('save')"
                    class  = "skin-color"></i>

                 </span>
                  <span
                    @click.stop     = "deleteTheme(map_theme.theme)"
                    class           = "action sidebar-button sidebar-button-icon"
                    style           = "padding: 5px;"
                    v-t-tooltip:top = "'cancel'"
                  >
                    <i
                      :class = "$fa('trash')"
                      style  = "color: red;">
                    </i>
                  </span>

                </span>

              </div>
            </li>
          </ul>
        </li>
      </ul>
    </li>
  </ul>
</template>

<script>

import InputText          from "./InputText.vue";
import GUI                from "services/gui";
import ApplicationState   from 'store/application';
import { XHR }            from 'utils/XHR';
import { gettext as _ }   from 'g3w-i18n';

export default {

  name: "changemapthemes",

  components: {
    InputText
  },

  props: {

    map_themes: {
      type: Object,
      default: { project: [], custom: [] }
    },

    layerstrees: {
      type: Array,
    },

  },

  data() {
    return {
      active_theme:  ApplicationState.map_theme,
      collapsed:    'collapsed' === ApplicationState.project.state.toc_themes_init_status,
      // user themes
      custom_theme: {
        name:     'add-user-theme',
        label:    'Name of new map theme',
        i18nLabel: true,
        value:     null,
        editable:  true,
        type:      'varchar',
        input:    { type: 'text', options: {} },
        visible:  true,
        //@TODO add info messsage to validation input name text
        validate: {
          valid:    false,
          required: true,
          error: 'Invalid or exiting name',
        }
      },
      /**@since 3.10.0 whether show add a new map theme form **/
      show_form: false,
    }
  },

  methods: {
    /**
     * @since 3.11.0
     */
    toggle() {
      //in case of no new form map_theme is show
      if (!this.show_form) {
        document.getElementById('g3w-catalog-views').classList.toggle('menu-open');
        this.collapsed = !this.collapsed;
      }
    },

    /**
     * Create params for save or update custom map theme
     * 
     * @private
     */
    _getMapThemeParams() {
      const params   = { layerstree: [], styles: {} };
      const traverse = (nodes, tree) => {
        nodes.forEach(node => {
          const item = undefined !== node.id
            ? {                                           // a layer node
              id:       node.id,
              name:     node.name,
              visible:  node.visible,
              expanded: node.expanded,
            }
            : {                                           // a group node
              name:                 node.name,
              checked:              node.checked,
              expanded:             node.expanded,
              'mutually-exclusive': node['mutually-exclusive']
            };
          // handle recursion (group node)
          if (Array.isArray(node.nodes)) {
            item.nodes = [];
            traverse(node.nodes, item.nodes);
          }
          // set style of layer
          if (undefined !== node.id) {
            params.styles[node.id] = node.styles.find(s => s.current).name; // get current layer style
          }
          tree.push(item);
        });
      };

      // loop through child nodes
      traverse(this.layerstrees[0].tree[0].nodes, params.layerstree);

      return params;
    },

    /**
     * Save current theme (layerstree state)
     * 
     * @since 3.10.0
     */
    async saveTheme() {
      const theme = this.custom_theme.value;
      // skip when no name provided 
      if (!theme) {
        return;
      }
      try {
        const params   = this._getMapThemeParams();
        const response = await XHR.post({
          url:         `${ApplicationState.project.urls.map_themes}${encodeURIComponent(theme)}/`,
          contentType: 'application/json',
          data:        JSON.stringify(params),
        });
        // handle server error
        if (!response.result) {
          throw response;
        }
        this.map_themes.custom.push({ theme: this.custom_theme.value, styles: params.styles });
        // show a success add custom matp theme message to user
        GUI.showUserMessage({ type: 'success', message: 'Theme saved successfully', autoclose: true });
        // close dialog
        this.show_form    = false;
        //set as current active name map theme
        this.active_theme.theme = this.custom_theme.value;
        //need to wait watch
        await this.$nextTick();
        //set custom map theme value to null. Reset value
        this.custom_theme.value = null;
      } catch(e) {
        console.warn(e);
        GUI.showUserMessage({ type: 'alert', message: e.error || 'info.server_error' });
      }
    },

    async updateTheme(theme) {
      // skip when no name provided
      if (!theme) {
        return;
      }
      try {
        const params   = this._getMapThemeParams();
        const response = await XHR.post({
          url:         `${ApplicationState.project.urls.map_themes}${encodeURIComponent(theme)}/`,
          contentType: 'application/json',
          data:        JSON.stringify(params),
        });
        // handle server error
        if (!response.result) {
          throw response;
        }
        // update custom map theme styles
        Object.assign(this.map_themes.custom.find(mt => theme === mt.theme), {
          styles:     params.styles,
          layerstree: params.layerstree,
        });
        // show a success update map theme message to user
        GUI.showUserMessage({ type: 'success', message: 'Theme updated successfully', autoclose: true });
      } catch(e) {
        console.warn(e);
        GUI.showUserMessage({ type: 'alert', message: e.error || 'info.server_error' });
      }
    },

    /**
     * Remove map theme from custom themes
     * 
     * @param theme
     * 
     * @since 3.10.0
     */
    deleteTheme(theme) {
      GUI.dialog.confirm(_('Do you want delete the theme?'), async bool => {
        // skip when ..
        if (!bool || !theme) {
          return;
        }
        try {
          const response = await (await fetch(`${ApplicationState.project.urls.map_themes}${encodeURIComponent(theme)}/`, {
            method: 'DELETE',
          })).json();
          // handle server error
          if (!response.result) {
            throw response;
          }
          this.map_themes.custom = this.map_themes.custom.filter(({ theme:t }) => t !== theme);
          // show a success message to user
          GUI.showUserMessage({ type: 'success', message: 'Theme deleted successfully', autoclose: true })
          // in the case of deleted current map theme set current theme to null
          if (theme === this.active_theme.theme) { this.active_theme.theme = null;}
        } catch(e) {
          console.warn(e);
          GUI.showUserMessage({ type: 'alert', message: e.error || 'info.server_error' });
        }
      });
    },

  },

  watch: {

    'active_theme.theme': {
      immediate: false,
      handler(map_theme) {
        this.$emit('change-map-theme', map_theme);
      }
    },

    'custom_theme.value'(name) {
      // can save check if value name is set and is not yet set on custom map_theme
      setTimeout(() => {
        //@since 4.0.7 Need to check if current map theme name exist in project or custom map themes. 
        this.custom_theme.validate.valid = name ? !(this.map_themes.project.concat(this.map_themes.custom)).find(({ theme }) => theme === name.trim()) : false;
      }, 200)

    },

    async show_form(bool) {
      this.custom_theme.value = null;
      // remove all "col-sm-12" classes so input is adapted to 100% width
      if (bool) {
        await this.$nextTick();
        Array.from(this.$refs.add_map_theme_input.$el.children).forEach(child => child.classList.remove('col-sm-12'));
      }
    },

  },

  created() {
    //set legged user.In the case of anonymous user, id is undefined and user can't save a custom map theme
    this.logged = undefined !== ApplicationState.user.id;
  }

}
</script>

<style scoped>
  #g3w-catalog-toc-views {
    margin-bottom: 5px;
    border-bottom: 2px solid;
  }
  .g3w-map-theme-anchor {
    padding: 0;
    margin-bottom: 5px;
  }
  .g3w-map-theme-anchor > section {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    padding: 5px;
  }
  .add-map-theme {
    border-top: 2px solid;
    margin: 5px 0;
  }
  .add-map-theme-input {
    width: 100%;
  }
  #g3w-catalog-views {
    display: none;
    padding: 0;
  }
  #g3w-catalog-views.menu-open {
    display: block;
  }
  .current_map_theme {
    overflow: hidden;
    white-space: normal;
    text-overflow: ellipsis;
  }
  .project_map_theme {
    font-weight: bold;
    padding: 3px;
    border-bottom: 1px solid #fff;
  }
  .user_map_theme {
    font-weight: bold;
    padding: 5px 3px;
    display: flex;
    justify-content: space-between;
    align-self: baseline;
    border-bottom: 1px solid #fff;
  }
</style>