<!--
  @file
  @since v3.7
-->

<template>
  <ul class="sidebar-menu">
    <li
      id="g3w-catalog-toc-views"
      class="treeview sidebaritem skin-border-color"
      style="margin-bottom: 5px; border-bottom: 2px solid"
    >
      <a
        href="#"
        ref="g3w-map-theme-ancor"
        style="padding: 0; margin-bottom: 5px;"
      >
        <section style="display: flex;  flex-wrap: wrap; align-items: center; padding: 5px;">
          <i
            style="padding: 3px;"
            :class="g3wtemplate.getFontClass('caret-down')">
          </i>
          <i
            style="padding: 0 0 0 4px;"
            :class="g3wtemplate.getFontClass('eye')">
          </i>
          <!-- Text of current theme -->
          <span
            v-if="current_map_theme"
            class="treeview-label g3w-long-text"
            style="overflow: hidden; white-space: normal;text-overflow: ellipsis;"
          >
            <span
              style="color: #cccccc !important;"
              v-t:pre="'sdk.catalog.current_map_theme_prefix'"
            >:</span>
            <span
              class="skin-color"
              style="font-size: 1.1em;">
                {{ current_map_theme }}
            </span>
          </span>
          <span
            v-else
            class="treeview-label"
            style="color: #cccccc !important; font-weight: bold"
          >
            <span v-t="'sdk.catalog.choose_map_theme'"></span>
          </span>
          <!-- Save theme button -->
          <span
            @click.stop="showSaveSection = !showSaveSection"
            :class="g3wtemplate.getFontClass('save')"
            class="action sidebar-button sidebar-button-icon skin-color"
            style="margin-left: auto; font-size: 1.2em; padding: 5px;"></span>
        </section>

        <!-- SAVE MAP THEME SECTION -->
        <section
          v-show="showSaveSection"
          id="save-map-theme"
          @click.stop=""
          style="
            flex-basis: 100%;
            display: flex;
            flex: 1 1;
            justify-content: space-between;
            align-items: center;
            background-color: #2c3b41;
            padding: 0 5px;
            margin-top: 5px;"
        >
          <div class="form-group">
            <label
              for="save-map-theme-input"
              class="skin-color">Nome</label>
            <input
              id="save-map-theme-input"
              style="margin-bottom: 0"
              v-model="themeName"
              class="form-control">
          </div>
          <button
            @click.stop="save"
            v-disabled="!canSave"
            style="height: 50px; font-weight: bold"
            class="btn skin-background-color"
            v-t="'save'"></button>
        </section>
      </a>

      <ul
        id="g3w-catalog-views"
        class="treeview-menu"
        :class="{'menu-open': !collapsed}"
        :style="{display: collapsed ? 'none' : 'block'}"
      >
        <li style="padding: 5px 5px 5px 17px">
          <div
            v-for="(map_theme, index) in map_themes"
            :key="map_theme.theme"
          >
            <input
              type="radio"
              name="radio"
              :id="`g3w-map_theme-${index}`"
              :value="map_theme.theme"
              v-model="current_map_theme"
              class="magic-radio"
              :checked="map_theme.default">
            <label
              :for="`g3w-map_theme-${index}`"
              style="display: flex; justify-content: space-between;"
            >
              <span class="g3w-long-text">{{ map_theme.theme }}</span>
            </label>
          </div>
        </li>
      </ul>
    </li>
  </ul>
</template>

<script>
  import ProjectsRegistry from 'store/projects';

  /**
   * Attributes to send to server of layerstrees object
   *
   * node (single layer): keys [id, name, showfeaturecount, visible]
   * group (Group) : keys [checked, expanded, mutually-exclusive, name, nodes]
   */
  const LAYERSTREES_KEYS = {
    node:  ['id', 'name', 'showfeaturecount', 'visible'],
    group: ['name', 'checked', 'expanded', 'mutually-exclusive', 'nodes']
  }

  export default {
    name: "changemapthemes",
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
      const current_map_theme = this.map_themes.find(map_theme => map_theme.default);
      return {
        current_map_theme: current_map_theme ? current_map_theme.theme : null,
        collapsed:         'collapsed' === ProjectsRegistry.getCurrentProject().state.toc_themes_init_status,
        canSave:           false, /** @since 3.10.0 */
        themeName:         null, /** @since 3.10.0 */
        showSaveSection:   false /** @since 3.10.0 */
      }
    },
    methods: {
      /**
       * Save current theme (layerstree state)
       * @since 3.10.0
       */
      save() {

        console.log(this.layerstrees[0].tree)
        //@TODO
        this.$emit('save-map-theme');
      }
    },
    watch: {
      'current_map_theme': {
        immediate: false,
        handler(map_theme) {
          this.$emit('change-map-theme', map_theme);
        }
      },
      'themeName'(name) {
        this.canSave = name ? name.trim() : false;
      },
      showSaveSection() {
        this.themeName = null;
      }
    }
  }
</script>