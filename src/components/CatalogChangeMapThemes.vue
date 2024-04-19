<!--
  @file
  @since v3.7
-->

<template>
  <ul class="sidebar-menu">
    <li
      id    = "g3w-catalog-toc-views"
      class = "treeview sidebaritem skin-border-color"
    >

      <a href="#" class="g3w-map-theme-anchor">
        <section>
          <i :class="g3wtemplate.getFontClass('caret-down')" style="padding: 3px;"></i>
          <i :class="g3wtemplate.getFontClass('eye')"        style="padding: 0 0 0 4px;"></i>
          <!-- Text of current theme -->
          <span
            v-if  = "active_theme"
            class = "current_map_theme treeview-label g3w-long-text"
          >
            <span v-t:pre="'sdk.catalog.current_map_theme_prefix'" style="color: #ccc !important;">:</span>
            <span class="skin-color" style="font-size: 1.1em;">{{ active_theme }}</span>
          </span>
          <!-- Choose a theme -->
          <div v-else class="choose_map_theme treeview-label" v-t="'sdk.catalog.choose_map_theme'"></div>
        </section>
      </a>

      <!-- ADD NEW MAP THEME (FORM) -->
      <div
        v-if  = "show_form"
        class = "add-map-theme skin-border-color"
      >
        <div style="display: flex; justify-content: end; padding-top: 5px;">
          <span
            v-t-tooltip:left.create = "'close'"
            @click.stop             = "show_form = false"
            :class                  = "g3wtemplate.getFontClass('close')"
            class                   = "sidebar-button sidebar-button-icon"
            style                   = "padding: 2px; margin: 2px;"
          ></span>
        </div>
        <div class="container add-map-theme-input">
          <input-text
            ref    = "add_map_theme_input"
            :state = "custom_theme"
          />
        </div>
        <div style="margin-top: 5px;">
          <button
            class       = "sidebar-button-run btn btn-block"
            v-t         = "'add'"
            @click.stop = "save"
            v-disabled  = "!custom_theme.validate.valid">
          </button>
        </div>
      </div>
      <ul
        v-else
        id     = "g3w-catalog-views"
        class  = "treeview-menu"
        :class = "{'menu-open': !collapsed}"
      >
        <!-- LIST PROJECT MAP THEME -->
        <li id="g3w-catalog-views-project">
          <ul style="padding: 0">
            <li>
              <div v-t="'sdk.catalog.project_map_theme'" class="project_map_theme"></div>
            </li>
            <li style="padding: 5px 5px 5px 17px;">
              <div
                v-for = "(map_theme, i) in map_themes.project"
                :key  = "map_theme.theme"
              >
                <input
                  type     = "radio"
                  name     = "radio"
                  :id      = "`g3w-map_theme-${i}`"
                  :value   = "map_theme.theme"
                  v-model  = "active_theme"
                  class    = "magic-radio"
                  :checked = "map_theme.default"
                />
                <label
                  :for  = "`g3w-map_theme-${i}`"
                  style = "display: flex; justify-content: space-between;"
                >
                  <span class="g3w-long-text">{{ map_theme.theme }}</span>
                </label>
              </div>
            </li>
          </ul>
        </li>
        <!-- LIST USER MAP THEME -->
        <li v-if="logged" id="g3w-catalog-views-user">
          <ul style="padding: 0">
            <li>
              <div class="user_map_theme">
                <span v-t="'sdk.catalog.user_map_theme'"></span>
                <!-- Add theme button -->
                <span
                  v-t-tooltip:left.create = "'add'"
                  @click.stop             = "show_form = !show_form"
                  :class                  = "g3wtemplate.getFontClass('plus')"
                  class                   = "action sidebar-button sidebar-button-icon"
                  style                   = "margin-left: auto; padding: 5px;"
                >
                </span>
              </div>
            </li>
            <!-- DELETE THEME -->
            <li style="padding: 5px 5px 5px 17px">
              <div
                v-for="(map_theme, i) in map_themes.custom"
                :key="map_theme.theme"
                style = "display: flex; justify-content: space-between;"
              >
                <span>
                  <input
                    type     = "radio"
                    name     = "radio"
                    :id      = "`g3w-map_theme-${i}-user`"
                    :value   = "map_theme.theme"
                    v-model  = "active_theme"
                    class    = "magic-radio"
                    :checked = "map_theme.default"
                  />
                  <label :for = "`g3w-map_theme-${i}-user`">
                    <span class="g3w-long-text">{{ map_theme.theme }}</span>
                  </label>
                </span>
                <span
                  @click.stop = "deleteTheme(map_theme.theme)"
                  :class      = "g3wtemplate.getFontClass('trash')"
                  class       = "action sidebar-button sidebar-button-icon"
                  style       = "color: red; padding: 5px;"
                ></span>
              </div>
            </li>
          </ul>
        </li>
      </ul>
    </li>
  </ul>
</template>

<script>
import ProjectsRegistry   from 'store/projects';
import InputText          from "./InputText.vue";
import GUI                from "services/gui";
import ApplicationState   from 'store/application-state';


const { t } = require('core/i18n/i18n.service');

/**
 * Attributes to send to server of layerstrees object
 *
 * node (single layer): keys [id, name, showfeaturecount, visible]
 * group (Group) : keys [checked, expanded, mutually-exclusive, name, nodes]
 */
const LAYERSTREES_ATTRIBUTES = {
  node:  ['id', 'name', 'visible', 'expanded'],
  group: ['name', 'checked', 'expanded', 'mutually-exclusive']
}

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
    const theme = Object.values(this.map_themes).flat().find(mt => mt.default);
    return {
      active_theme: (theme && theme.theme) || null,
      collapsed:    'collapsed' === ProjectsRegistry.getCurrentProject().state.toc_themes_init_status,
      // user themes
      custom_theme: {
        name:     'add-user-theme',
        label:    'sdk.catalog.choose_map_theme_input_label',
        i18nLabel: true,
        value:     null,
        editable:  true,
        type:      'varchar',
        input:    { type: 'text', options: {} },
        visible:  true,
        //@TODO add info messsage to validation input name text
        //info:   'Info',
        validate: { valid: false, required: true }
      },
      /**@since 3.10.0 whether show add new map theme form **/
      show_form: false,
    }
  },

  methods: {

    /**
     * Save current theme (layerstree state)
     * 
     * @since 3.10.0
     */
    async save() {
      const params   = { layerstree: [], styles: {} };
      const treeItem = (type, node) => LAYERSTREES_ATTRIBUTES[type].reduce((acc, attr) => { acc[attr] = node[attr]; return acc; }, {});
      const traverse = (nodes, tree) => {
        nodes.forEach(node => {
          //in the case of a layer
          if (undefined !== node.id) {
            params.styles[node.id] = node.styles.find(s => s.current).name; // get current layer style
            tree.push(treeItem('node', node));
          }
          //in the case of group
          if (Array.isArray(node.nodes)) {
            const group = treeItem('group', node)
            group.nodes = [];
            tree.push(group);
            traverse(node.nodes, group.nodes);
          }
        });
      };

      // loop through child nodes
      traverse(this.layerstrees[0].tree[0].nodes, params.layerstree);

      /** @TODO send to server state of current projects  **/

      try {
        const saved = await ProjectsRegistry.getCurrentProject().saveMapTheme(this.custom_theme.value, params);
        if (saved.result) {
          this.map_themes.custom.push({ theme: this.custom_theme.value, styles: params.styles });
          // show a success message to user
          GUI.showUserMessage({ type: 'success', message: 'sdk.catalog.saved_map_theme', autoclose: true });
          // close dialog
          this.show_form = false;
          //set as current active name map theme
          this.active_theme = this.custom_theme.value;
          //need to wait watch
          await this.$nextTick();
          //set custom map theme value to null. Reset value
          this.custom_theme.value = null;
        }        
      } catch (e) {
        console.warn(e);
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
      GUI.dialog.confirm(t('sdk.catalog.question_delete_map_theme'), async bool => {
        // skip when ..
        if (!bool) {
          return;
        }
        try {
          const deleted = await ProjectsRegistry.getCurrentProject().deleteMapTheme(theme);
          if (deleted.result) {
            this.map_themes.custom = this.map_themes.custom.filter(({ theme:t }) => t !== theme);
            // show a success message to user
            GUI.showUserMessage({ type: 'success', message: 'sdk.catalog.delete_map_theme', autoclose: true })
            // in the case of deleted current map theme set current theme to null
            if (theme === this.active_theme) { this.active_theme = null;}
          }          
        } catch (e) {
          console.warn(e)
        }
      });
    },

  },

  watch: {

    'active_theme': {
      immediate: false,
      handler(map_theme) {
        //in the case of save new custom map theme, no need to emit event
        //in case of remove custom map theme at moment se as default
        if (null === map_theme || map_theme === this.custom_theme.value) { return }
        this.$emit('change-map-theme', map_theme);
      }
    },

    'custom_theme.value'(name) {
      // can save check if value name is set and is not yet set on custom map_theme
      setTimeout(() => {
        this.custom_theme.validate.valid = name ? !this.map_themes.custom.find(({ theme }) => theme === name.trim()) : false;
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
  padding: 5px;
  width: 100%;
}
#g3w-catalog-views {
  display: none;
}
#g3w-catalog-views.menu-open {
  display: block;
}
.current_map_theme {
  overflow: hidden;
  white-space: normal;
  text-overflow: ellipsis;
}
.choose_map_theme {
  color: #ccc !important;
  font-weight: bold;
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