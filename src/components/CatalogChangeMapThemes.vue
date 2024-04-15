<!--
  @file
  @since v3.7
-->

<template>
  <ul class="sidebar-menu">
    <li
      id    = "g3w-catalog-toc-views"
      class = "treeview sidebaritem skin-border-color"
      style = "margin-bottom: 5px; border-bottom: 2px solid"
    >
      <a
        href  = "#"
        ref   = "g3w-map-theme-ancor"
        style = "padding: 0; margin-bottom: 5px;"
      >
        <section style="display: flex;  flex-wrap: wrap; align-items: center; padding: 5px;">
          <i
            style  = "padding: 3px;"
            :class = "g3wtemplate.getFontClass('caret-down')">
          </i>
          <i
            style  = "padding: 0 0 0 4px;"
            :class = "g3wtemplate.getFontClass('eye')">
          </i>
          <!-- Text of current theme -->
          <span
            v-if  = "current_map_theme"
            class = "treeview-label g3w-long-text"
            style = "overflow: hidden; white-space: normal;text-overflow: ellipsis;"
          >
            <span
              style   = "color: #cccccc !important;"
              v-t:pre = "'sdk.catalog.current_map_theme_prefix'"
            >:</span>
            <span
              class = "skin-color"
              style = "font-size: 1.1em;">{{ current_map_theme }}</span>
          </span>
          <span
            v-else
            class = "treeview-label"
            style = "color: #cccccc !important; font-weight: bold"
          >
            <span v-t="'sdk.catalog.choose_map_theme'"></span>
          </span>
        </section>
      </a>
      <!-- ADD NEW MAP THEME (FORM) -->
      <template v-if="showSaveMapThemeForm">
        <li
          style = "border-top: 2px solid; margin: 5px 0"
          class = "skin-border-color"
          >
            <div style="display: flex; justify-content: end; padding-top: 5px;">
              <span
                v-t-tooltip:left.create = "'close'"
                @click.stop             = "showSaveMapThemeForm = false"
                :class                  = "g3wtemplate.getFontClass('close')"
                class                   = "sidebar-button sidebar-button-icon"
                style                   = "padding: 5px; margin: 3px; cursor: pointer;"
              ></span>
            </div>
            <div
              class = "container add-map-theme-input"
              style = "padding: 5px; width: 100%"
            >
              <input-text
                ref    = "add_map_theme_input"
                :state = "adduserthemeinput" />
            </div>
            <div style="margin-top: 5px;">
              <button
                class       = "sidebar-button-run btn btn-block"
                v-t         = "'add'"
                @click.stop = "save"
                v-disabled  = "!canSave">
              </button>
            </div>
          </li>
      </template>
      <template v-else>
        <ul
          id     = "g3w-catalog-views"
          class  = "treeview-menu"
          :class = "{'menu-open': !collapsed}"
          :style = "{display: collapsed ? 'none' : 'block'}"
        >
          <!-- LIST PROJECT MAP THEME -->
          <li id="g3w-catalog-views-project">
            <ul style="padding: 0">
              <li>
                <div
                  style = "font-weight: bold; padding: 5px 3px"
                  v-t   = "'sdk.catalog.project_map_theme'">
                </div>
                <divider/>
              </li>
              <li style="padding: 5px 5px 5px 17px;">
                  <div
                    v-for = "(map_theme, index) in map_themes"
                    :key  = "map_theme.theme"
                  >
                    <input
                      type     = "radio"
                      name     = "radio"
                      :id      = "`g3w-map_theme-${index}`"
                      :value   = "map_theme.theme"
                      v-model  = "current_map_theme"
                      class    = "magic-radio"
                      :checked = "map_theme.default">
                    <label
                      :for  = "`g3w-map_theme-${index}`"
                      style = "display: flex; justify-content: space-between;"
                    >
                      <span class="g3w-long-text">{{ map_theme.theme }}</span>
                    </label>
                  </div>
              </li>
              </ul>
          </li>
          <!-- LIST USER MAP THEME -->
          <li id="g3w-catalog-views-user">
            <ul style="padding: 0">
              <li>
                <div style="font-weight: bold; padding: 5px 3px; display: flex; justify-content: space-between">
                  <span v-t="'sdk.catalog.user_map_theme'"></span>
                  <!-- Add theme button -->
                  <span
                    @click.stop = "showSaveMapThemeForm = !showSaveMapThemeForm"
                    :class      = "g3wtemplate.getFontClass('plus')"
                    class       = "action sidebar-button sidebar-button-icon"
                    style       = "margin-left: auto; padding: 5px; cursor:pointer;"
                  >
                  </span>
                </div>
                <divider/>
              </li>
              <li style="padding: 5px 5px 5px 17px">
                <div
                  v-for="(map_theme, index) in map_themes"
                  :key="map_theme.theme"
                >
                  <input
                    type     = "radio"
                    name     = "radio"
                    :id      = "`g3w-map_theme-${index}-user`"
                    :value   = "map_theme.theme"
                    v-model  = "current_map_theme"
                    class    = "magic-radio"
                    :checked = "map_theme.default">
                  <label
                    :for  = "`g3w-map_theme-${index}-user`"
                    style = "display: flex; justify-content: space-between;"
                  >
                    <span class="g3w-long-text">{{ map_theme.theme }}</span>
                  </label>
                </div>
              </li>
            </ul>
          </li>
        </ul>
      </template>
    </li>
  </ul>
</template>

<script>
import ProjectsRegistry from 'store/projects';
import InputText        from "./InputText.vue";

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
      type: Array,
      default: []
    },
    layerstrees: {
      type: Array,
    }
  },
  data() {
    const current_map_theme = this.map_themes.find(mt => mt.default);
    return {
      showSaveMapThemeForm : false,  /**@since 3.10.0 **/
      current_map_theme    : current_map_theme ? current_map_theme.theme : null,
      collapsed            : 'collapsed' === ProjectsRegistry.getCurrentProject().state.toc_themes_init_status,
      canSave              :  false, /** @since 3.10.0 */
      adduserthemeinput: {
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
      }
    }
  },
  methods: {
    /**
     * Save current theme (layerstree state)
     * @since 3.10.0
     */
    save() {
      const params = {
        layerstree : [],
        styles     : {},
      };
      const createTreeItem = (type, node) => {
       return LAYERSTREES_ATTRIBUTES[type]
        .reduce((accumulator, a) => {
          accumulator[a] = node[a];
          return accumulator
        }, {} );
      }
      const traverse = (nodes, tree) => {
        //loop through nodes (children)
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          //check if layer (node) of folder
          if (undefined !== node.id) {
            params.styles[node.id] = node.styles.find(s => s.current).name; //get current layer style
            tree.push(createTreeItem('node', node));
          }
          if (Array.isArray(node.nodes)) {
            const group = createTreeItem('group', node)
            group.nodes = [];
            tree.push(group);
            traverse(node.nodes, group.nodes);
          }
        }
      };
      traverse(this.layerstrees[0].tree[0].nodes, params.layerstree);

      /** @TODO send to server state of current projects  **/
    }
  },
  watch: {
    'current_map_theme': {
      immediate: false,
      handler(map_theme) {
        this.$emit('change-map-theme', map_theme);
      }
    },
    'adduserthemeinput.value'(name) {
      this.canSave = name ? name.trim() : false;
    },
    async showSaveMapThemeForm(bool) {
      this.adduserthemeinput.value = null;
      if (bool) {
        await this.$nextTick();
        //need to remove all class so input is adapted to 100% width
        for (let i = 0; i < this.$refs.add_map_theme_input.$el.children.length; i++) {
          this.$refs.add_map_theme_input.$el.children[i].classList.remove('col-sm-12')
        }
      }
    }
  }
}
</script>