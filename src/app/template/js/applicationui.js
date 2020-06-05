const ApplicationService = require('core/applicationservice');
const ProjectsRegistry = require('core/project/projectsregistry');
const uniqueId = require('core/utils/utils').uniqueId;
const HeaderItem = require('./headeritem');
const GUI = require('sdk/gui/gui');
const layout = require('./layout');
const compiledTemplate = Vue.compile(require('../html/app.html'));
const AppUI = Vue.extend({
  ...compiledTemplate,
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
    openProjectsMenu: function() {
      GUI.openProjectsMenu();
    }
  },
  watch: {
    'language'(lng, currentlng) {
      currentlng && ApplicationService.changeLanguage(lng);
    }
  },
  created() {
    this.custom_modals = [];
    this.custom_header_items_position = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: []
    };
    this.customlinks = Array.isArray(this.appconfig.header_custom_links) ? this.appconfig.header_custom_links.filter((customitem) => {
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

    !!this.appconfig.credits && $.get(this.appconfig.credits).then((credits)=> {
      this.customcredits = credits !== 'None' && credits
    });
  },
  mounted: function() {
    this.language = this.appconfig.user.i18n;
    this.$nextTick(function(){
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
    })
  },
});

module.exports = AppUI;
