<!-- ORIGINAL SOURCE: -->
<!-- gui/projectsmenu/menu.html@v3.4 -->
<!-- gui/projectsmenu/menu.js@v3.4 -->

<template>
  <div id="menu-projects" class="container">
    <div class="row row-equal">
      <!-- item -->
      <div v-for="(menuitem, index) in state.menuitems"  :key="menuitem.title"  class="col-xs-12 col-sm-4 project-menu">
        <div class="project-menu-item-image" @click="trigger(menuitem)">
          <img :src="logoSrc(menuitem.thumbnail)" class="img-responsive">
        </div>
        <div class="project-menu-item-content">
          <div class="project-menu-item-text">
            <h4 class="project-menu-item-title"></h4>
            <button v-if="menuitem.description"  @click.prevent.stop="toggleDescription(index)" class="btn skin-button"  style="font-weight: bold; color: #ffffff; padding: 10px; width: 100%">
              <i :class="g3wtemplate.getFontClass('description')"></i>
            </button>
            <div class="project-menu-item-description" :ref="`description_${index}`" v-html="menuitem.description"></div>
          </div>
        </div>
      </div>
      <div v-if="!state.menuitems.length" style="margin-left:15px;">
        <h2 v-t="'no_other_projects'"></h2>
      </div>
    </div>
  </div>
</template>

<script>
  import {FAKEIMAGE} from "constant";

  const {t} = require('core/i18n/i18n.service');
  const GUI = require('gui/gui');
  const ProjectsRegistry = require('core/project/projectsregistry');

  export default {
  data() {
    return {
      state: null,
      loading: false
    }
  },
  methods: {
    toggleDescription(index){
      this.$refs[`description_${index}`][0].classList.toggle('show');
    },
    trigger(item) {
      if (item.cbk) {
        //set full screen modal
        GUI.showFullModal({
          show: true
        });
        GUI.setLoadingContent(true);
        const {gid} = item;
        item.cbk.call(item, {
          gid
        }).then(promise => {
            //changeProject is a setter so it return a promise
            promise
              .then(project=>document.title = project.state.html_page_title)
              .fail(() => {
                GUI.notify.error("<h4>" + t("error_map_loading") + "</h4>" +
                  "<h5>"+ t("check_internet_connection_or_server_admin") + "</h5>");
              })
              .always(() => {
                GUI.showFullModal({
                  show: false
                });
                GUI.setLoadingContent(false);
              })
          })
      }
      else if (item.href) window.open(item.href, '_blank');
      else if (item.route) GUI.goto(item.route);
    },
    logoSrc(src) {
      let imageSrc;
      if (src) {
        imageSrc= src.indexOf(ProjectsRegistry.config.mediaurl) !== -1 ? src : (src.indexOf('static') === -1 && src.indexOf('media') === -1) ?
          `${ProjectsRegistry.config.mediaurl}${src}`: FAKEIMAGE;
      } else imageSrc = FAKEIMAGE;
      return this.$options.host && `${this.$options.host}${imageSrc}` || imageSrc;
    }
  }
};
</script>
<style scoped>
  .project-menu-item-description {
    display: none;
    margin-top: 5px;
  }
  .project-menu-item-description.show {
    display: block;
  }
</style>