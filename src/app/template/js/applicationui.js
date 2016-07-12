var layout = require('./layout');
var AppUI = Vue.extend({
  template: require('../html/app.html'),
  ready: function(){
    /* start to render LayoutManager layout */
    layout.loading(false);
    layout.setup();
    $("body").toggleClass("fixed");
    layout.layout.fixSidebar();
    //Fix the problem with right sidebar and layout boxed
    layout.pushMenu.expandOnHover();
    layout.layout.activate();
    layout.controlSidebar._fix($(".control-sidebar-bg"));
    layout.controlSidebar._fix($(".control-sidebar"));
    var controlsidebarEl = layout.options.controlSidebarOptions.selector;
    function setFloatBarMaxHeight(){
      $(controlsidebarEl).css('max-height',$(window).innerHeight());
      $('.g3w-sidebarpanel').height($(window).innerHeight()-$('.main-header').innerHeight());
    }
    setFloatBarMaxHeight();
    function setModalHeight(){
      $('#g3w-modal-overlay').height($(window).innerHeight());
    }
    $(window).resize(function() {
      setFloatBarMaxHeight();
      setModalHeight();
    });
   },
   methods: {
      closePanel: function(){
        sidebarService.closePanel();
      },
      isMobile: function(){return isMobile.any}
    },
});

module.exports = AppUI;
