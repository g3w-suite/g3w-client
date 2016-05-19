var t = require('i18n.service');
var MapService = require('g3w/core/mapservice');

var ol3helpers = require('g3w-ol3/src/g3w.ol3').helpers;

Vue.component('g3w-map',{
  template: require('./map.html'),
  props: ['id'],
  ready: function(){
    var self = this;
    MapService.showViewer(this.$el.id);
    
    MapService.on('loadstart',function(){
      $(MapService.getViewport()).prepend('<div id="maploadspinner" class="mapspinner-wrapper"><div class="spinner"></div></div>');
    });
    
    MapService.on('loadend',function(){
      $("#maploadspinner").remove();
    });
  }
})
