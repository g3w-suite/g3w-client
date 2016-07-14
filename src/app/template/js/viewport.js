var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');

var View = Vue.extend({
  template: require('../html/view.html'),
  replace: false,
  data: function(){
    return {
      primary: false,
      width: 3,
      visible: false
    }
  }
});

var ViewportComponent = Vue.component('viewport',{
  template: require('../html/viewport.html'),
  components: {
    map: View,
    content: View
  }
})

var ViewportService = function(){  
  this.state = {
    primaryView: 'map'
  };
  
  this.views = {
    map: null,
    contenx: null
  }

  this.init = function(mapComponent, contentxComponent) {
    var mapView = new View({
      el: '#g3w-map-view'
    });
    this.views['map'] = mapView;
    
    var contentxView = new View({
      el: '#g3w-contenx-view'
    });
    this.views['contentx'] = contentxView;
    
    this.setPrimaryView('map')

    // monto la mappa
    mapComponent.mount('#g3w-contenx-view');
    // monto il contentx
    //contentxComponent.mount(#g3w-contenx-view);
  }
  
  this.setPrimaryView = function(viewName) {
    this.state.primaryView = viewName;
    _.forEach(this.view,function(view){
      view.primary = false;
    })
    this.views[viewName].primary = true;
  };
  
  this.showSecondaryView = function(widthClass) {
    if ([2,3].indexOf(widthClass) > -1) {
      // 1/2 o 1/3
    }
  };
  
  this.getContentView = function() {
    return this.state,views['contentx'].component;
  }
};
inherit(ViewportService, G3WObject);

module.exports = new ViewportService;
