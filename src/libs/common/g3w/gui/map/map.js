var t = require('i18n/i18n.service');
var GUI = require('g3w/gui/gui.js');   
var MapService = require('g3w/core/mapservice');
var ol3helpers = require('g3w-ol3/src/g3w.ol3').helpers;

function mainHeight(){
  //return $(window).innerHeight()-$(".navbar").innerHeight();
  //return $(window).innerHeight();
  var topHeight = $(".navbar").innerHeight();
  var bottomHeight = 0;
  
  if ($(".bottombar").is(":visible")) {
    bottomHeight = $(".bottombar").innerHeight()
  }
  return $(window).innerHeight() - topHeight - bottomHeight;
}

/* map resize calculations */
function setMapDivHeight(){
  var height = mainHeight();
  $("#map").height(height);
  MapService.viewer.map.updateSize();
}

function setMapDivWidth(){
  var offset = $(".main-sidebar").offset().left;
  var width = $(".main-sidebar").innerWidth();
  var sideBarSpace = width + offset;
  $("#map").width($(window).innerWidth() - sideBarSpace);
  MapService.viewer.map.updateSize();
}

var MapView = Vue.component('g3w-map',{
  template: require('./map.html'),
  ready: function(){
    var self = this;
    MapService.showViewer(this.$el.id);
    
    MapService.on('loadstart',function(){
      $(MapService.getViewport()).prepend('<div id="maploadspinner" class="mapspinner-wrapper"><div class="spinner"></div></div>');
    });
    
    MapService.on('loadend',function(){
      $("#maploadspinner").remove();
    });
    
    GUI.on('guiready',function(){
      setMapDivHeight();
      
      $('.main-sidebar').on('webkitTransitionEnd transitionend msTransitionEnd oTransitionEnd', function () {
          $(this).trigger('trans-end');
          setMapDivWidth();
      });
      
      var drawing = false;
      var resizeFired = false;
      
      GUI.on('guiresized',function(){
        resizeFired = true;
        drawResize();
      });
      
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
            setMapDivWidth();
            requestAnimationFrame(drawResize);
        } else {
            drawing = false;
        }
      }
      
    })
  },
  methods: {
    'opentable': function(){
      GUI.showBottomTable();
    }
  }
});

module.exports = MapView;
