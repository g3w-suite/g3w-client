var t = require('i18n.service');
var MapService = require('g3w/core/mapservice');
var ProjectService = require('g3w/core/projectservice');

var ol3helpers = require('g3w-ol3/src/g3w.ol3').helpers;

Vue.component('g3w-map',{
  template: require('./map.html'),
  ready: function(){
    MapService.showViewer(this.$el.id);
  }
})
