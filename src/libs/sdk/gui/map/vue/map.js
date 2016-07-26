var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var merge = require('core/utils/utils').merge;
var t = require('core/i18n/i18n.service').t;
var resolve = require('core/utils/utils').resolve;
var GUI = require('gui/gui');   
var Component = require('gui/vue/component');
var RouterService = require('core/router');
var ol3helpers = require('g3w-ol3/src/g3w.ol3').helpers;
var MapsRegistry = require('core/map/mapsregistry');
var MapService = require('../mapservice');

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
function setMapDivHeight(map){
  var height = mainHeight();
  $("#map").height(height);
  map.updateSize();
}

function setMapDivWidth(map){
  var offset = $(".main-sidebar").offset().left;
  var width = $(".main-sidebar").innerWidth();
  var sideBarSpace = width + offset;
  $("#map").width($(window).innerWidth() - sideBarSpace);
  map.updateSize();
}

var vueComponentOptions = {
  template: require('./map.html'),
  ready: function(){
    var self = this;
    
    var mapService = this.$options.mapService;
    
    mapService.showViewer(this.$el.id);
    
    // questo serve per quando viene cambiato progetto/vista cartografica, in cui viene ricreato il viewer (e quindi la mappa)
    mapService.onafter('setupViewer',function(){
      mapService.showViewer(self.$el.id);
    });
    
    GUI.on('ready',function(){
      setMapDivHeight(mapService.getMap());
      
      $('.main-sidebar').on('webkitTransitionEnd transitionend msTransitionEnd oTransitionEnd', function () {
          $(this).trigger('trans-end');
          setMapDivWidth(mapService.getMap());
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
            setMapDivHeight(mapService.getMap());
            setMapDivWidth(mapService.getMap());
            requestAnimationFrame(drawResize);
        } else {
            drawing = false;
        }
      }
      
    })
  }
}

var InternalComponent = Vue.extend(vueComponentOptions);

Vue.component('g3w-map', vueComponentOptions);

function MapComponent(options){
  base(this,options);
  this.id = "map-component";
  this.title = "Catalogo dati";
  this._mapService = new MapService;
  merge(this, options);
  this.internalComponent = new InternalComponent({
    mapService: this._mapService
  });
}
inherit(MapComponent, Component);

var proto = MapComponent.prototype;

proto.getMapService = function() {
  return this._mapService;
};

module.exports =  MapComponent;
