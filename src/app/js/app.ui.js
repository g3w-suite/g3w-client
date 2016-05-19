var t = require('i18n.service');
require('g3w/gui/vue.directives');
require('g3w/gui/map/map');
require('g3w/gui/geocoding/geocoding');
var layout = require('layout/layout');
var SideBar = require('layout/sidebar/sidebar');
var FloatBar = require('layout/floatbar/floatbar');
var MapService = require('g3w/core/mapservice');

var GUI = require('g3w/gui/gui.js');

Vue.component('app',{
    template: require('./app.html'),
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
      
      FloatBar.init(layout);
      
      function mainHeight(){
        //return $(window).innerHeight()-$(".navbar").innerHeight();
        return $(window).innerHeight();
      }
      
      /* map resize calculations */
      function setMapDivHeight(){
        $("#map").height(mainHeight());
        MapService.viewer.map.updateSize();
      }
      
      function setMapDivWidth(){
        var offset = $(".main-sidebar").offset().left;
        var width = $(".main-sidebar").innerWidth();
        var sideBarSpace = width + offset;
        $("#map").width($(window).innerWidth() - sideBarSpace);
        MapService.viewer.map.updateSize();
      }
      
      /*$("body").on("expanded.pushMenu",function(){
        setMapDivWidth(true);
      });
      $("body").on("collapsed.pushMenu",function(){
        setMapDivWidth(true);
      });*/
      setMapDivHeight();
      
      var controlsidebarEl = layout.options.controlSidebarOptions.selector;
      
      function setFloatBarMaxHeight(){
        $(controlsidebarEl).css('max-height',$(window).innerHeight());
      }
      setFloatBarMaxHeight();
      
      function setModalHeight(){
        $('#g3w-modal-overlay').height($(window).innerHeight());
      }
      
      /*$(controlsidebarEl).slimScroll({
          height: mainHeight()
      });*/
      $('.main-sidebar').on('webkitTransitionEnd transitionend msTransitionEnd oTransitionEnd', function () {
          $(this).trigger('trans-end');
          setMapDivWidth();
      });
      
      var drawing = false;
      var resizeFired = false;
      
      $(window).resize(function() {
        // set resizedFired to true and execute drawResize if it's not already running
        if (drawing === false) {
            resizeFired = true;
            drawResize();
        }
        setFloatBarMaxHeight();
        setModalHeight();
      });

      function drawResize() {
        var height;
        // render friendly resize loop
        if (resizeFired === true) {
            resizeFired = false;
            drawing = true;
            setMapDivHeight();
            setMapDivWidth();

            requestAnimationFrame(drawResize);
        } else {
            drawing = false;
        }
      }
      
      GUI.ready();
      /* end map resize calculations */
    }
});
