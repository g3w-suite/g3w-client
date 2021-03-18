const ApplicationService = require('core/applicationservice');
const ProjectsRegistry = require('core/project/projectsregistry');
const uniqueId = require('core/utils/utils').uniqueId;
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
      current_custom_modal_content: null,
      appState: ApplicationService.getState(),
      current_custom_modal_content: null,
      language: null
    }
  },
  components: {
    HeaderItem
  },
  computed: {
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
    powered_by() {
      return this.appconfig.group.powered_by;
    },
    g3w_suite_logo() {
      const client_url = this.urls.clienturl;
      return `${client_url}images/g3wsuite_logo.png`;
    },
    credits_logo: function() {
      const client_url = this.urls.clienturl;
      return `${client_url}images/logo_gis3w_156_85.png`;
    },
    logo_url: function() {
      const logo_project_url = this.currentProject.getThumbnail();
      return logo_project_url ? logo_project_url : `${this.appconfig.mediaurl}${this.appconfig.logo_img}`;
    },
    logo_link: function() {
      const logo_link = this.getLogoLink();
      return logo_link ? logo_link : "#";
    },
    logo_link_target: function() {
      const logo_link = this.getLogoLink();
      return logo_link ? "_blank" : "";
    },
    project_title: function() {
      return this.currentProject.getState().name;
    },
    user: function() {
      return (this.appconfig.user && this.appconfig.user.username) ? this.appconfig.user : null;
    },
    login_url(){
      return this.appconfig.user.login_url
    },
    numberOfProjectsInGroup: function() {
      return this.appconfig.projects.length;
    },
    frontendurl: function() {
      return this.urls.frontendurl;
    },
    main_title() {
      const main_title = this.appconfig.main_map_title;
      const group_name = this.appconfig.group.name;
      return main_title ? `${main_title} - ${group_name}` : group_name;
    },
  },
  methods: {
    resize(){
      if (!this.isIframe) {
        const max_width = this.$refs.navbar_toggle.offsetWidth > 0 ? this.$refs.navbar.offsetWidth - this.$refs.navbar_toggle.offsetWidth :
          this.$refs.mainnavbar.offsetWidth - this.rightNavbarWidth;
        this.$refs.main_title_project_title.style.maxWidth = `${max_width - this.logoWidth || 150 }px`;
      }
    },
    showCustomModalContent(id){
      const {content} = this.custom_modals.find(custommodal => custommodal.id === id);
      this.current_custom_modal_content = content;
    },
    closePanel: function(){
      sidebarService.closePanel();
    },
    getLogoLink: function() {
      return this.appconfig.logo_link ? this.appconfig.logo_link: null;
    },
    openProjectsMenu() {
      GUI.openProjectsMenu();
    }
  },
  watch: {
    'language'(lng, currentlng) {
      currentlng && ApplicationService.changeLanguage(lng);
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
    $(window).resize(function() {
      setFloatBarMaxHeight();
      setModalHeight();
    });
  },
});

module.exports = AppUI;
