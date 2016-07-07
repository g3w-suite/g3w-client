var inherit = require('core/utils').inherit;
var base = require('core/utils').base;
var G3WObject = require('core/g3wobject');
var GUI = require('gui/gui');
var RouterService = require('core/router');

var Page = function(parentView,config){
  this.parentView = parentView;
  this.config = config;
  this.pageComponent = config.pageComponent;
  this.urls = config.server.urls;

  base(this);
  
  this.onShow = function(path,request) {
    var self = this;
    this.parentView.on('pagemounted',function(){
      self.handleRequest(path,request);
    });
    return this.pageComponent;
  }
};
inherit(Page,G3WObject);

module.exports = Page;
