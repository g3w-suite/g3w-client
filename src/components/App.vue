<!-- ORIGINAL SOURCE: -->
<!-- gui/app/app.html@v3.4 -->
<!-- gui/app/app.js@v3.4 -->

<template>
<div class="wrapper" v-disabled="app.disabled">
  <cookie-law theme="dark-lime" :buttonText="cookie_law_buttonText">
    <div slot="message" v-t="'cookie_law.message'">
    </div>
  </cookie-law>
  <header v-if="!isIframe" class="main-header">
    <!-- Logo -->
    <!-- Header Navbar: style can be found in header.less -->
    <nav ref="navbar" class="navbar navbar-inverse navbar-fixed-top" role="navigation">
      <div class="container-fluid">
        <div class="navbar-header">
          <button ref='navbar_toggle' type="button" class="navbar-toggle" data-toggle="collapse" data-target="#main-navbar">
            <i style="font-size: 1.3em;" :class="g3wtemplate.getFontClass('ellips-v')"></i>
          </button>
          <!-- Toggle button on navbar only for mobile -->
          <a v-if="isMobile()" href="#" class="sidebar-toggle" data-toggle="offcanvas" role="button">
            <i style="font-size: 1.3em;" :class="g3wtemplate.getFontClass('bars')"></i>
          </a>
          <div class="logo-wrapper" :class="{'mobile': isMobile()}">
            <a  v-if="logo_url" :href="logo_link" :target="logo_link_target" class="project_logo_link">
              <img class="img-responsive" style="max-width: 250px;" ref="img_logo" :src="logo_url">
            </a>
            <div ref="main_title_project_title" class="project_title_content">
              <div class="main_title">{{ main_title }}</div>
              <div class="sub_title">{{project_title}}</div>
            </div>
          </div>
        </div>
        <div ref="mainnavbar" class="collapse navbar-collapse" id="main-navbar" style="text-align: center; overflow: hidden">
          <navbarleftitems></navbarleftitems>
          <navbarrightitems></navbarrightitems>
          <ul ref="app-navbar-nav" class="nav navbar-nav navbar-right app-navbar-nav">
            <li v-if="!user" class="dropdown user user-menu">
              <a :href="login_url">
                <i :class="g3wtemplate.getFontClass('sign-in')" aria-hidden="true"></i>
                <span v-t="'sign_in'"></span>
              </a>
            </li>
            <header-item :state="state" @show-custom-modal-content="showCustomModalContent" v-for="state in custom_header_items_position[0]" :key="state.id"></header-item>
            <li id="changemaps" class="dropdown user" v-if="numberOfProjectsInGroup > 1">
              <a href="#" @click="openProjectsMenu" class="dropdown-toggle" data-toggle="dropdown">
                <i :class="g3wtemplate.getFontClass('change-map')" aria-hidden="true"></i>
                <span v-t="'changemap'"></span>
              </a>
            </li>
            <header-item :state="state" @show-custom-modal-content="showCustomModalContent" v-for="state in custom_header_items_position[1]" :key="state.id"></header-item>
            <li v-if="user" class="dropdown user user-menu">
              <a href="#" class="dropdown-toggle" data-toggle="dropdown">
                <i :class="g3wtemplate.getFontClass('user')"></i>
                <span class="hidden-xs">{{ user.username }}</span>
              </a>
              <ul class="dropdown-menu">
                <li class="user-header">
                  <p>
                    {{ user.first_name }} {{ user.last_name }}
                  </p>
                </li>
                <li class="user-footer">
                  <div class="pull-left" v-if="user.admin_url">
                    <a :href="user.admin_url" class="btn btn-default btn-flat skin-color bold" ><i :class="g3wtemplate.getFontClass('folder')"></i> Admin</a>
                  </div>
                  <div class="pull-right">
                    <a :href="user.logout_url" class="btn btn-default btn-flat skin-color bold" v-t="'logout'"><i :class="g3wtemplate.getFontClass('sign-out')" style="margin-right: 2px;"></i></a>
                  </div>
                </li>
              </ul>
            </li>
            <header-item :state="state" @show-custom-modal-content="showCustomModalContent" v-for="state in custom_header_items_position[2]" :key="state.id"></header-item>
            <li class="dropdown user user-menu">
              <a href="#" data-toggle="modal" data-target="#credits" class="dropdown-toggle">
                <i :class="g3wtemplate.getFontClass('credits')" aria-hidden="true"></i>
                <span>Credits</span>
              </a>
            </li>
            <header-item :state="state" @show-custom-modal-content="showCustomModalContent" v-for="state in custom_header_items_position[3]" :key="state.id"></header-item>
            <li v-if="languages" class="g3w-languages">
              <select v-select2="'language'" class="form-control" :templateSelection="templateResultLanguages" :templateResult="templateResultLanguages" v-model="language" style="cursor:pointer; width: 130px;">
                <option v-for="_language in languages" :key="_language[0]" :value="_language[0]" :selected="_language[0] === language && 'selected'">
                  {{_language[1]}}
                </option>
              </select>
            </li>
            <li v-if="frontendurl" class="dropdown">
              <a :href="frontendurl">
                <span><i :class="g3wtemplate.getFontClass('home')"></i> Home</span>
              </a>
            </li>
            <header-item :state="state" @show-custom-modal-content="showCustomModalContent" v-for="state in custom_header_items_position[4]" :key="state.id"></header-item>
          </ul>
        </div>
      </div>
    </nav>
  </header>
  <!-- Left side column. contains the logo and sidebar -->
  <sidebar></sidebar>
  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper" :style="{paddingTop: isIframe ? 0 : null}">
    <viewport :appState="appState"></viewport>
  </div>
  <!-- /.content-wrapper -->
  <!-- Control Sidebar -->
  <floatbar></floatbar>
  <!-- /.control-sidebar -->
  <!-- Add the sidebar's background. This div must be placed
       immediately after the control sidebar -->
  <div class="control-sidebar-bg"></div>
  <!--full screen modal element-->
  <div class="modal fade modal-fullscreen force-fullscreen" id="full-screen-modal" tabindex="-1" role="dialog" data-backdrop="static" data-keyboard="false" aria-labelledby="full-screen-modal" aria-hidden="true"></div>
  <!---->
  <div id="credits" class="modal fade">
    <div class="modal-dialog" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <button type="button" class="close" data-dismiss="modal" aria-label="Close"
            style="color: #ffffff; font-weight: bold; opacity: 1; position: absolute; right: 25px; top: 20px">
            <span aria-hidden="true">&times;</span>
          </button>
          <div style="display: flex; flex-direction: column; justify-content: space-around; justify-items: center; align-items: center">
            <div class="customcredits" v-if="!!customcredits" v-html="customcredits"></div>
            <div v-if="powered_by">
              <div class="g3w-credits-block">
                <div v-t="'credits.g3wSuiteFramework'" style="background-color: #95ad36; padding: 5px; border-radius:3px; color: #ffffff" class="credit-title-logo"></div>
                <a target="_blank" href="https://g3wsuite.it/">
                  <img class="g3w-suite-logo" :src="g3w_suite_logo" alt="">
                </a>
                <div v-t="'credits.g3wSuiteDescription'" style="margin-top: 10px;"></div>
              </div>
              <div v-t:pre ="'credits.productOf'" class="credit-title-logo g3w-credits-block" style="font-size: 1em; display: flex; justify-content: center">
                <a style="text-align: center!important;" href="http://www.gis3w.it" target="_blank">
                  <img width="60" style="margin-left: 5px" :src="credits_logo" class="img-responsive center-block" alt="">
                </a>
              </div>
              <address id="address-credits"  style="line-height: 1.3; text-align: center; margin-top: 5px; display: flex; justify-content: center">
                <span style="padding: 2px">
                  <span style="color: #95ad36; font-weight: bold" :class="g3wtemplate.getFontClass('marker')" aria-hidden="true"></span> Montecatini Terme - Italy
                </span>
                <span style="padding: 2px">
                  <span style="color: #95ad36" :class="g3wtemplate.getFontClass('mobile')" aria-hidden="true"></span>  +39 393 8534336
                </span>
                <span style="padding: 2px">
                  <span style="color: #95ad36" :class="g3wtemplate.getFontClass('mail')" aria-hidden="true"></span>
                  <a href="mailto:info@gis3w.it" style="color:#000000"> info@gis3w.it</a>
                </span>
              </address>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div id="custom_modal" class="modal fade">
    <div class="modal-dialog" role="document">
      <div class="modal-content" v-html="current_custom_modal_content"></div>
    </div>
  </div>
</div>
</template>

<script>
import CookieLaw from "vue-cookie-law";
import HeaderItem from 'components/HeaderItem.vue';

const ApplicationService = require('core/applicationservice');
const ProjectsRegistry = require('core/project/projectsregistry');
const { uniqueId } = require('core/utils/utils');
const {t} = require('core/i18n/i18n.service');
const GUI = require('gui/gui');
const layout = require('gui/app/layout');
const { resizeMixin } = require('gui/vue/vue.mixins');

export default {
  mixins: [resizeMixin],
  data() {
    return {
      customcredits: false,
      appState: ApplicationService.getState(),
      current_custom_modal_content: null,
      language: null,
      cookie_law_buttonText: t('cookie_law.buttonText')
    }
  },
  components: {
    HeaderItem,
    CookieLaw
  },
  computed: {
    app(){
      return this.appState.gui.app;
    },
    languages() {

      /***
       * check if is length of languages is more than one
       */
      const languages = Array.isArray(this.appconfig.i18n) && this.appconfig.i18n || [];
      return languages.length > 1 && languages;
    },
    currentProject() {
      return ProjectsRegistry.getCurrentProject();
    },
    appconfig() {
      return ApplicationService.getConfig();
    },
    isIframe() {
      return !!this.appconfig.group.layout.iframe;
    },
    urls() {
      return this.appconfig.urls;
    },
    staticurl(){
      return this.urls.staticurl;
    },
    powered_by() {
      return this.appconfig.group.powered_by;
    },
    clienturl(){
      return this.urls.clienturl;
    },
    g3w_suite_logo() {
      return `${this.clienturl}images/g3wsuite_logo.png`;
    },
    credits_logo() {
      return `${this.clienturl}images/logo_gis3w_156_85.png`;
    },
    logo_url() {
      const logo_project_url = this.currentProject.getThumbnail();
      return logo_project_url ? logo_project_url : `${this.appconfig.mediaurl}${this.appconfig.logo_img}`;
    },
    logo_link() {
      const logo_link = this.getLogoLink();
      return logo_link ? logo_link : "#";
    },
    logo_link_target() {
      const logo_link = this.getLogoLink();
      return logo_link ? "_blank" : "";
    },
    project_title() {
      return this.currentProject.getState().name;
    },
    user() {
      return (this.appconfig.user && this.appconfig.user.username) ? this.appconfig.user : null;
    },
    login_url(){
      return this.appconfig.user.login_url
    },
    numberOfProjectsInGroup() {
      return this.appconfig.projects.length;
    },
    frontendurl() {
      return this.urls.frontendurl;
    },
    main_title() {
      const main_title = this.appconfig.main_map_title;
      const group_name = this.appconfig.group.name || this.appconfig.group.slug;
      return main_title ? `${main_title} - ${group_name}` : group_name;
    },
  },
  methods: {
    templateResultLanguages(state) {
      if (!state.id) return state.text;
      const flagsurl = `${this.staticurl}img/flags`;
      const $state = $(`<div style="font-weight: bold; display:flex; align-items: center; justify-content: space-around">
            <img src="${flagsurl}/${state.element.value.toLowerCase()}.png" />
            <span style="margin-left: 5px;">${state.text}</span> 
          </span>`
      );
      return $state;
    },
    async resize(){
      if (!this.isIframe) {
        await this.$nextTick();
        const max_width = this.$refs.navbar_toggle.offsetWidth > 0 ? this.$refs.navbar.offsetWidth - this.$refs.navbar_toggle.offsetWidth :
          this.$refs.mainnavbar.offsetWidth - this.$refs['app-navbar-nav'].offsetWidth;
        this.$refs.main_title_project_title.style.maxWidth = `${max_width - this.logoWidth - 15}px`;
      }
    },
    showCustomModalContent(id){
      const {content} = this.custom_modals.find(custommodal => custommodal.id === id);
      this.current_custom_modal_content = content;
    },
    closePanel(){
      sidebarService.closePanel();
    },
    getLogoLink() {
      return this.appconfig.logo_link ? this.appconfig.logo_link: null;
    },
    openProjectsMenu() {
      GUI.openProjectsMenu();
    }
  },
  watch: {
    'language'(lng, currentlng) {
      if (currentlng) {
        ApplicationService.changeLanguage(lng);
        this.cookie_law_buttonText = t('cookie_law.buttonText');
      }
    }
  },
  beforeCreate() {
    this.delayType = 'debounce';
    this.delayTime = 0;
  },
  created() {
    this.language = this.appconfig._i18n.lng;
    this.custom_modals = [];
    this.custom_header_items_position = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: []
    };
    this.customlinks = Array.isArray(this.appconfig.header_custom_links) ? this.appconfig.header_custom_links.filter(customitem => {
      if (customitem !== null) {
        const id = customitem.id = uniqueId();
        customitem.type === 'modal' && this.custom_modals.push({
          id,
          content: customitem.content
        });
        let position = 1*(customitem.position || 0);
        position = position > 4 ? 4 : position < 0 || Number.isNaN(position)? 0 : position;
        this.custom_header_items_position[position].push(customitem);
        return true
      }
      return false;
    }): [];

    !!this.appconfig.credits && $.get(this.appconfig.credits).then(credits=> this.customcredits = credits !== 'None' && credits);
  },
  async mounted() {
    this.logoWidth = 0;
    await this.$nextTick();
    const rightNavBarElements = !this.isIframe ? this.$refs.mainnavbar.getElementsByTagName('ul') : [];
    const elementLenght = rightNavBarElements.length;
    this.rightNavbarWidth = 15; // margin right
    for (let i = 0; i < elementLenght; i++ ) {
      this.rightNavbarWidth+= rightNavBarElements.item(i).offsetWidth;
    }
    this.language = this.appconfig.user.i18n;
    await this.$nextTick();
    !this.isIframe && this.$refs.img_logo.addEventListener('load', ()=>{
      this.logoWidth = this.$refs.img_logo.offsetWidth + 15; // added marging
      this.resize();
    }, {once: true});
    /* start to render LayoutManager layout */
    layout.loading(false);
    layout.setup();
    //Fix the problem with right sidebar and layout boxed
    layout.pushMenu.expandOnHover();
    layout.controlSidebar._fix($(".control-sidebar-bg"));
    layout.controlSidebar._fix($(".control-sidebar"));
    const controlsidebarEl = layout.options.controlSidebarOptions.selector;
    function setFloatBarMaxHeight() {
      $(controlsidebarEl).css('max-height',$(window).innerHeight());
      $('.g3w-sidebarpanel').css('height',$(window).height() - $("#main-navbar").height());
    }
    setFloatBarMaxHeight();
    function setModalHeight(){
      $('#g3w-modal-overlay').css('height',$(window).height());
    }
    $(window).resize(() => {
      setFloatBarMaxHeight();
      setModalHeight();
    });
  },
};
</script>