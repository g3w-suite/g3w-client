var ApplicationService = require('core/applicationservice');
var ProjectsRegistry = require('core/project/projectsregistry');
var layout = require('./layout');
var AppUI = Vue.extend({
  template: require('../html/app.html'),
  ready: function(){
    /* start to render LayoutManager layout */
    layout.loading(false);
    layout.setup();
    //Fix the problem with right sidebar and layout boxed
    layout.pushMenu.expandOnHover();
    layout.controlSidebar._fix($(".control-sidebar-bg"));
    layout.controlSidebar._fix($(".control-sidebar"));
    var controlsidebarEl = layout.options.controlSidebarOptions.selector;
    function setFloatBarMaxHeight(){
      $(controlsidebarEl).css('max-height',$(window).innerHeight());
      $('.g3w-sidebarpanel').css('height',$(window).height() - $(".main-header").height());
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
  computed: {
    logo_url: function() {
      var config = ApplicationService.getConfig();
      var logo_url;
      if (config.logo_img && config.logo_img!='') {
        logo_url = config.mediaurl+config.logo_img;
      }
      return logo_url;
    },
    logo_link: function() {
      var logo_link = this.getLogoLink();
      return logo_link ? logo_link : "#";
    },
    logo_link_target: function() {
      var logo_link = this.getLogoLink();
      return logo_link ? "_blank" : "";
    },
    project_title: function() {
      var currentProject = ProjectsRegistry.getCurrentProject();
      return currentProject.state.name;
    },
    user: function() {
      var user = ApplicationService.getConfig().user;
      // verifico nel caso fosse un oggetto vuoto
      if (_.isEmpty(user)) {user = null}
      return user;
    }
  },
  methods: {
    closePanel: function(){
      sidebarService.closePanel();
    },
    isMobile: function(){return isMobile.any},
    getLogoLink: function() {
      var logo_link = null;
      if (ApplicationService.getConfig().logo_link) {
        logo_link = ApplicationService.getConfig().logo_link;
      }
      return logo_link;
    }
  }
});

module.exports = AppUI;