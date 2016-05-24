var t = require('i18n/i18n.service');
var MapService = require('g3w/core/mapservice');
var GUI = require('g3w/gui/gui.js');
var ViewportService = require('g3w/gui/view/viewport');
var MapView = require('g3w/gui/map/map');
require('g3w/gui/geocoding/geocoding');

var layout = require('./layout/layout');
var FloatbarService = require('./layout/floatbar').FloatbarService;


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
      
      ViewportService.setView(new MapView());
      
      GUI.ready();
    }
});

module.exports = BaseUI;
