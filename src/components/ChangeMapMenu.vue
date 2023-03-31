<!--
  @file
  @since 3.8.0
-->

<template>
  <div id="g3w-change-map-menu">
    <template v-if="current !== 'root'">
      <div style="display: flex; align-items: center; color: #ffffff" class="skin-background-color">
        <span
          v-disabled="loading"
          @click.stop="back"
          style="font-size: 2em; margin: 5px; cursor: pointer; padding: 3px; border: 2px solid #ffffff; border-radius: 3px; "
          :class="g3wtemplate.getFontClass('reply')">
        </span>
        <div v-if="parent" style="margin: auto">
          <h3 style="font-weight: bold">{{parent.title || parent.name}}</h3>
        </div>
      </div>
    </template>

    <template v-else>

    </template>
    <div class="g3w-change-map-menu-container">
      <div
      v-for="item in items"
      :key="item.title"
      @click="trigger(item)"
      class="menu-item">

        <div

          v-if="logoSrc(item)"
          class="menu-item-image">

          <img
            @error="ImageError(item)"
            :src="logoSrc(item)"
            class="img-responsive">
        </div>

      <div
        v-else
        class="no-menu-item-image skin-background-color">
      </div>

      <div class="menu-item-content">
        <div class="menu-item-text">
          <h4 class="menu-item-title">{{ item.title }}</h4>
          <div v-html="item.description"></div>
        </div>
      </div>

    </div>
    </div>
  </div>

</template>

<script>
import ApplicationService from 'services/application';
import ProjectsRegistry from 'store/projects';
import {API_BASE_URLS} from "constant";

const Projections = require('g3w-ol/projection/projections');
const {XHR} = require('core/utils/utils');
const {t} = require('core/i18n/i18n.service');

export default {
  data() {
    return {
      state: null,
      loading: false,
      current: 'projects', // projects, groups, root
      items: [],
      parent: null,
      steps: [],
      currentProjectGroupId: null, // group id of starting project
    }
  },
  methods: {
    ImageError(item){
      item.thumbnail = null;
    },
    back(){
      if (this.steps.length > 1) {
        this.steps = [];
        const item = this.macrogroups.find(macrogroup => macrogroup.id === this.parent.id);
        this.showGroups(item);
      } else {
        this.showRoot();
      }
    },
    showRoot(){
      this.current = 'root';
      this.items = this.macrogroupsandgroups;
      this.steps = [];
    },
    async showGroups(item){
      this.loading = true;
      this.parent = item;
      try {
        this.items = await XHR.get({
          url: `${API_BASE_URLS.ABOUT.group}/${item.id}`
        });
        this.current = 'groups';

      } catch(err) {
        this.items = [];
      }
      this.steps.push(this.current);
      this.loading = false;
    },
    async showProjects(item){
      this.loading = true;
      this.parent = item;
      if (this.parent.id === this.currentProjectGroupId){
        this.items = ProjectsRegistry.getListableProjects();
        this.current = 'projects';
      } else {
        try {
          this.items = await XHR.get({
            url: `${API_BASE_URLS.ABOUT.projects.replace('__G3W_GROUP_ID__', item.id)}`
          });
          this.current = 'projects';
        } catch(err){
          this.items = [];
        }
      }
      this.steps.push(this.current);
      this.loading = false;
    },
    async trigger(item) {
      switch(this.current) {
        case 'projects':
          const {map_url, url} = item;
          const {origin} = location;
          const epsg = this.parent.srid ? `EPSG:${this.parent.srid}` : this.parent.crs.epsg;
          await Projections.registerProjection(epsg);
          return ApplicationService.changeMapProject({
            url: `${origin}${ProjectsRegistry.getBaseUrl()}${url || map_url.replace(/^\//, "")}`,
            epsg
          });
          break;
        case 'groups': {
          this.showProjects(item);
          break;
        }
        case 'macrogroup': {
          this.showGroups(item);
          break;
        }
        case 'root':
          // item is a macrogroup
          if ("undefined" === typeof item.srid) {
            this.showGroups(item)
          } else {
            // item is a group
            this.showProjects(item);
          }
          break;
      }
    },

    logoSrc({thumbnail, logo_img, header_logo_img}) {
      let imageSrc;
      const src = thumbnail || logo_img || header_logo_img;
      if (src) {
        imageSrc= src.indexOf(ProjectsRegistry.config.mediaurl) !== -1 ? src : (src.indexOf('static') === -1 && src.indexOf('media') === -1) ?
          `${ProjectsRegistry.config.mediaurl}${src}`: null;
      } else imageSrc = null;
      return imageSrc && this.$options.host ? `${this.$options.host}${imageSrc}` : imageSrc;
    }
  },
  created() {
    // at start time set item projects
    this.items = ProjectsRegistry.getListableProjects();
    this.parent = ProjectsRegistry.getCurrentProjectGroup();
    this.currentProjectGroupId = this.parent.id;
    // get macrogroups
    this.macrogroups = ApplicationService.getConfig().macrogroups;
    // get projects
    this.groups = ApplicationService.getConfig().groups;
    // collect all groups and macrogroups
    this.macrogroupsandgroups = [...this.macrogroups, ...this.groups];
    // check if group on initConfig is referred to macrogrop
    const isMacroGroup = this.macrogroups.find(macrogroup => macrogroup.id === this.parent.id);
    if (isMacroGroup) {
      // check belong group
      const findGroup = this.groups.find(group => group.id === this.parent.id);
      if (findGroup) {
        this.parent = findGroup;
        this.currentProjectGroupId = this.parent.id;
      }
    }
    if (0 === this.items.length) {
      this.showRoot();
    }
  }
};
</script>
<style scoped>
  #g3w-change-map-menu {
    width: 100%;
    position: relative;
  }
  .g3w-change-map-menu-container {
    height: 100%;
    display: grid;
    grid-template-columns: repeat(3, minmax(100px, 1fr));
    grid-gap: 1em;
    overflow-y: auto;

  }
  .menu-item {
    cursor: pointer;
    margin-bottom: 20px;
    margin-top:20px;
  }

  .menu-item-image {
    position: relative;
    overflow: hidden;
    padding-bottom: 50%;
    opacity: 0.7;
  }
  .no-menu-item-image {
    width: 50%;
    height: 60px;
    border-radius: 3px;
    margin: auto;
    margin-bottom: 5px;
    opacity: 0.7;
  }
  .menu-item-image:hover, .no-menu-item-image:hover {
    opacity: 1;
  }


  .menu-item-image img {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    margin: auto
  }
  .menu-item-content {
    padding: 15px;
    background: rgba(255,255,255,0.3);
  }
  .menu-item-text {
    position: relative;
    overflow: hidden;
    height: 100%;
    text-align: justify;
  }
  .menu-item-title {
    text-align: center;
    font-weight: bold;
    background: rgba(255,255,255,0.5);
    padding: 5px;
  }
</style>