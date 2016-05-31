var t = require('i18n/i18n.service').t;
var MapService = require('g3w/core/mapservice');
var GUI = require('g3w/gui/gui.js');
var ViewportService = require('g3w/gui/view/viewport');
require('g3w/gui/geocoding/geocoding');
require('g3w/gui/vue.directives');

var layout = require('./layout/layout');
var SidebarService = require('./layout/sidebar').SidebarService;
var FloatbarService = require('./layout/floatbar').FloatbarService;

var AppService = require('./app.service.js')

var BaseUI = Vue.extend({
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
      
      FloatbarService.init(layout);

      
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
      
      /*$(controlsidebarEl).slimScroll({
          height: mainHeight()
      });*/
      
      ViewportService.setView(AppService.getDefaultView());
      
          // definisco (implemento) i metodi dell'API globale della GUI
      GUI.getResourcesUrl = function(){ return AppService.config.resourcesurl };
      // mostra un pannello nella floatbar
      GUI.showForm = _.bind(FloatbarService.showPanel,FloatbarService);
      GUI.closeForm = _.bind(FloatbarService.closePanel,FloatbarService);
      GUI.showListing = _.bind(FloatbarService.showPanel,FloatbarService);
      GUI.closeListing = _.bind(FloatbarService.closePanel,FloatbarService);
      // mostra un pannello nella sidebar
      GUI.showPanel = _.bind(SidebarService.showPanel,SidebarService);

      GUI.setModal = _.bind(AppService.showModalOverlay,AppService);
      
      GUI.ready();
    }
});

module.exports = BaseUI;
