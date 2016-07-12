var t = require('core/i18n/i18n.service').t;
var GUI = require('gui/gui');   
var Component = require('gui/vue/component');
var RouterService = require('core/router');
var MapService = require('core/mapservice');
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

var InternalComponent = {
  template: require('./map.html'),
  ready: function(){
    var self = this;
    
    MapService.showViewer(this.$el.id);
    
    // questo serve per quando viene cambiato progetto/vista cartografica, in cui viene ricreato il viewer (e quindi la mappa)
    MapService.onafter('setupViewer',function(){
      MapService.showViewer(self.$el.id);
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
  }

var MapViewComponent = Vue.component('g3w-map',
});

function MapComponent(options){
  base(this,options);
  this.id = "iternet-editing-panel";
  this.title = "Catalogo dati";
  this.InternalComponent = InternalComponent;
}
inherit(MapComponent, Component);

module.exports = new MapComponent;
