import CookieLaw from "vue-cookie-law";
const ApplicationService = require('core/applicationservice');
const ProjectsRegistry = require('core/project/projectsregistry');
const { uniqueId } = require('core/utils/utils');
const {t} = require('core/i18n/i18n.service');
const HeaderItem = require('gui/header/headeritem');
const GUI = require('gui/gui');
const layout = require('./layout');
const compiledTemplate = Vue.compile(require('./app.html'));
const { resizeMixin } = require('gui/vue/vue.mixins');
const AppUI = Vue.extend({
  ...compiledTemplate,
  mixins: [resizeMixin],
  data() {
    return {
      customcredits: false,
      appState: ApplicationService.getState(),
      current_custom_modal_content: null,
      language: null,
      colormode: null,
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
      return this.appconfig.i18n;
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
    changeColorMode(){
      if (this.colormode === 'dark') {
        document.body.classList.remove('skin-dark');
        document.body.classList.add(this.initBodySkinClass);
      } else {
        document.body.classList.remove(this.initBodySkinClass);
        document.body.classList.add('skin-dark');
      }
      this.colormode = this.colormode === 'dark' ? 'light' : 'dark';
    },
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

    !!this.appconfig.credits && $.get(this.appconfig.credits).then(credits => this.customcredits = credits !== 'None' && credits);
  },
  async mounted() {
    // get the initial skin class
    document.body.classList.forEach(className => {
      if (className.indexOf('skin-') !== -1) this.initBodySkinClass = className;
    });
    this.colormode = this.initBodySkinClass === 'skin-dark' ? 'dark': 'light';
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
});

module.exports = AppUI;
