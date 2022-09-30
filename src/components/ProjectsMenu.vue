<!-- ORIGINAL SOURCE: -->
<!-- gui/projectsmenu/menu.html@v3.4 -->
<!-- gui/projectsmenu/menu.js@v3.4 -->

<template>
  <div id="menu-projects" class="container">
    <div class="row row-equal">
      <!-- item -->
      <div v-for="(menuitem, index) in state.menuitems"  :key="menuitem.title" @click="trigger(menuitem)" class="col-xs-12 col-sm-4 project-menu">
        <div class="project-menu-item-image">
          <img :src="logoSrc(menuitem.thumbnail)" class="img-responsive">
        </div>
        <div class="project-menu-item-content">
          <div class="project-menu-item-text">
            <h4 class="project-menu-item-title">{{ menuitem.title }}</h4>
            <div :ref="`description_${index}`" class="project-menu-too-long-description" @mouseover="showFullDescription(index)" @mouseout="hideFullDescription(index)" v-html="menuitem.description"></div>
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
const t = require('core/i18n/i18n.service').t;
const GUI = require('gui/gui');
const ProjectsRegistry = require('core/project/projectsregistry');
const fakeImage = '/static/client/images/FakeProjectThumb.png';

export default {
  data() {
    return {
      state: null,
      loading: false
    }
  },
  methods: {
    showFullDescription(index){
      this.$refs[`description_${index}`][0].classList.remove('project-menu-too-long-description');
    },
    hideFullDescription(index){
      this.$refs[`description_${index}`][0].classList.add('project-menu-too-long-description');
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
<style scoped>
  /* styles for '...' */
  .project-menu-too-long-description {
    /* hide text if it more than N lines  */
    overflow: hidden;
    /* for set '...' in absolute position */
    position: relative;
    /* use this value to count block height */
    line-height: 1.2em;
    /* max-height = line-height (1.2) * lines max number (3) */
    max-height: 3.6em;
    /* fix problem when last visible word doesn't adjoin right side  */
    text-align: justify;
    /* place for '...' */
    padding-right: 1em;
  }
  /* create the ... */
  .project-menu-too-long-description:before {
    /* points in the end */
    content: '...';
    /* absolute position */
    position: absolute;
    /* set position to right bottom corner of block */
    right: 0;
    bottom: 0;
  }
  /* hide ... if we have text, which is less than or equal to max lines */
  .project-menu-too-long-description:after {
    /* points in the end */
    content: '';
    /* absolute position */
    position: absolute;
    /* set position to right bottom corner of text */
    right: 0;
    /* set width and height */
    width: 1em;
    height: 1em;
    margin-top: 0.2em;
    /* bg color = bg color under block */
    background: white;
  }
</style>