var t = require('core/i18n/i18n.service').t;
var GUI = require('gui/gui');   
var RouterService = require('core/router');
var ol3helpers = require('g3w-ol3/src/g3w.ol3').helpers;

var ContentxViewComponent = Vue.component('g3w-contentx',{
  template: require('./contentx.html'),
});

function ContentxView() {
  var self = this;
  var _viewComponent;
  
  this.getViewComponent = function(){
    if (!_viewComponent) {
      _viewComponent = new ContentxViewComponent;
    }
    return _viewComponent;
  };
  
  this.show = function(path){
    var view = RouterService.sliceFirst(path)[0];
    if (view == 'content') {
      var query = RouterService.getQueryParams(path);
      //
    }
  };
  
  RouterService.onafter('setRoute',function(path){
    self.show(path);
  });
}

module.exports = new ContentxView;
