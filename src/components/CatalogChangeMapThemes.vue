<!--
  @file
  @since v3.7
-->

<template>
  <ul class="sidebar-menu">
    <li id="g3w-catalog-toc-views" class="treeview sidebaritem skin-border-color" style="margin-bottom: 5px; border-bottom: 2px solid">
      <a href="#" ref="g3w-map-theme-ancor" style="display: flex; align-items: center; padding: 5px 5px 5px 2px;">
        <i style="padding: 3px;" :class="g3wtemplate.getFontClass('caret-down')"></i>
        <i style="padding: 0 0 0 4px;" :class="g3wtemplate.getFontClass('eye')"></i>
        <span v-show="current_map_theme " class="treeview-label g3w-long-text" style="overflow: hidden; white-space: normal;text-overflow: ellipsis;">
          <span style="color: #cccccc !important;" v-t:pre="'sdk.catalog.current_map_theme_prefix'">:</span>
          <span class="skin-color" style="font-size: 1.1em;">{{ current_map_theme }}</span>
        </span>
        <span v-show="!current_map_theme" class="treeview-label" style="color: #cccccc !important; font-weight: bold" >
          <span v-t="'sdk.catalog.choose_map_theme'"></span>
        </span>
      </a>
      <ul id="g3w-catalog-views" class="treeview-menu" :class="{'menu-open': !collapsed}" :style="{display: collapsed ? 'none' : 'block'}">
        <li style="padding: 5px 5px 5px 17px">
          <div v-for="(map_theme, index) in map_themes" :key="map_theme.theme">
            <input type="radio" name="radio" :id="`g3w-map_theme-${index}`" :value="map_theme.theme" v-model="current_map_theme" class="magic-radio" :checked="map_theme.default">
            <label :for="`g3w-map_theme-${index}`" class="" style="display: flex; justify-content: space-between;">
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

  export default {
    name: "catalog-change-map-themes",
    data(){
      const collapsed = ProjectsRegistry.getCurrentProject().state.toc_themes_init_status === 'collapsed';
      const current_map_theme = this.map_themes.find(map_theme => map_theme.default);
      return {
        current_map_theme: current_map_theme ? current_map_theme.theme : null,
        collapsed
      }
    },
    props: {
      map_themes: {
        type: Array,
        default: []
      }
    },
    watch: {
      'current_map_theme': {
        immediate: false,
        handler(map_theme){
          this.$emit('change-map-theme', map_theme);
        }
      }
    }
  }
</script>