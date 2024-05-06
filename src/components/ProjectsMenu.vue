<!--
  @file
  @since v3.7
-->

<template>
  <div id="menu-projects" class="container">
    <div class="row row-equal">
      <!-- item -->
      <div
        v-for  = "menuitem in state.menuitems"
        :key   = "menuitem.title"
        @click = "trigger(menuitem)"
        class  ="col-xs-12 col-sm-4 project-menu"
      >
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
import GUI              from 'services/gui';

const { t } = require('core/i18n/i18n.service');

const fakeImage = '/static/client/images/FakeProjectThumb.png';

export default {

  /** @since 3.8.6 */
  name: 'projects-menu',

  data() {
    return {
      state:   null,
      loading: false
    }
  },

  methods: {

    trigger(item) {
      if (item.cbk)        this._initCallback(item);
      else if (item.href)  window.open(item.href, '_blank');
      else if (item.route) GUI.goto(item.route);
      else                 console.log("No action for "+item.title);
    },

    /**
     * @since 3.8.0 
     */
    _initCallback(item) {
      this._toggleModal(true);
      item.cbk
        .call(item, { gid: item.gid })
        .then(promise => { // changeProject is a setter so it returns a promise
          promise
            .then(project => { if (project) document.title = project.state.html_page_title })
            .fail(() => { GUI.notify.error("<h4>" + t("error_map_loading") + "</h4>" + "<h5>"+ t("check_internet_connection_or_server_admin") + "</h5>"); })
            .always(() => { this._toggleModal(false); })
        });
    },

    /**
     * @since 3.8.0 
     */
    _toggleModal(state) {
      GUI.showFullModal({ show: state });
      GUI.setLoadingContent(state);
    },

    /**
     * @TODO extract as utility function (almost the same as `components/ChangeManpMenu::_setSrc(src)`) 
     */
    logoSrc(src) {
      let imageSrc;
      const host = this.$options.host || '';
      const has_media = src && (-1 !== src.indexOf(ProjectsRegistry.config.mediaurl));
      const not_static = src && (-1 === src.indexOf('static') && -1 === src.indexOf('media'))

      if (!src) {
        imageSrc = fakeImage
      } else if(has_media) {
        imageSrc = src;
      } else if(not_static) {
        imageSrc = `${ProjectsRegistry.config.mediaurl}${src}`;
      } else {
        imageSrc = fakeImage
      }
  
      return `${host}${imageSrc}`;
    },

  },

};
</script>