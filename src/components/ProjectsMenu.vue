<!--
  @file
  @since v3.7
-->

<template>
  <div id="menu-projects" class="container">
    <div class="row row-equal">
      <!-- item -->
      <div v-for="menuitem in state.menuitems"  :key="menuitem.title" @click="trigger(menuitem)" class="col-xs-12 col-sm-4 project-menu">
        <div class="project-menu-item-image">
          <img :src="logoSrc(menuitem.thumbnail)" class="img-responsive">
        </div>
        <div class="project-menu-item-content">
          <div class="project-menu-item-text">
            <h4 class="project-menu-item-title">{{ menuitem.title }}</h4>
            <div v-html="menuitem.description"></div>
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
import ProjectsRegistry from 'store/projects';
import GUI from 'services/gui';

const t = require('core/i18n/i18n.service').t;

const fakeImage = '/static/client/images/FakeProjectThumb.png';

export default {
  data() {
    return {
      state: null,
      loading: false
    }
  },
  methods: {
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
              .then(project => {
                if ("undefined" !== typeof project) {
                  document.title = project.state.html_page_title
                }
              })
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
      else console.log("No action for "+item.title);
    },
    logoSrc(src) {
      let imageSrc;
      if (src) {
        imageSrc= src.indexOf(ProjectsRegistry.config.mediaurl) !== -1 ? src : (src.indexOf('static') === -1 && src.indexOf('media') === -1) ?
          `${ProjectsRegistry.config.mediaurl}${src}`: fakeImage;
      } else imageSrc = fakeImage;
      return this.$options.host && `${this.$options.host}${imageSrc}` || imageSrc;
    }
  }
};
</script>