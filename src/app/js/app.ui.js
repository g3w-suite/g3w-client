var t = require('i18n.service');
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
      layout.setup();
      $("body").toggleClass("fixed");
      layout.layout.fixSidebar();
      //Fix the problem with right sidebar and layout boxed
      layout.pushMenu.expandOnHover();
      layout.layout.activate();
      layout.controlSidebar._fix($(".control-sidebar-bg"));
      layout.controlSidebar._fix($(".control-sidebar"));
      
      FloatBar.init(layout);
      
      /* map resize calculations */
      function setMapDivHeight(){
        $("#map").height($(window).innerHeight()-$(".navbar").innerHeight());
        MapService.viewer.map.updateSize();
      }
      
      function setMapDivWidth(animating){
        var offset = $(".main-sidebar").offset().left;
        // this is required because during animation I get the offset BEFORE starting to collapse while when not animating I need the offset minus the width
        if (!animating){
          offset = offset - $(".main-sidebar").innerWidth();
        }
        $("#map").width($(window).innerWidth() + offset);
        MapService.viewer.map.updateSize();
      }
      
      $("body").on("expanded.pushMenu",function(){
        setMapDivWidth(true);
      });
      $("body").on("collapsed.pushMenu",function(){
        setMapDivWidth(true);
      });
      setMapDivHeight();
      
      var drawing = false;
      var resizeFired = false;
      
      $(window).resize(function() {
        // set resizedFired to true and execute drawResize if it's not already running
        if (drawing === false) {
            resizeFired = true;
            drawResize();
        }
      });

      function drawResize() {
        var height;
        // render friendly resize loop
        if (resizeFired === true) {
            resizeFired = false;
            drawing = true;

            setMapDivHeight();
            setMapDivWidth(false);

            requestAnimationFrame(drawResize);
        } else {
            drawing = false;
        }
      }
      
      GUI.ready();
      /* end map resize calculations */
    }
});
