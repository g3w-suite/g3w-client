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

proto.layout = function(width,height) {
  $("#map").height(height);
  $("#map").width(width);
  this._mapService.getMap().updateSize();
};

module.exports =  MapComponent;
