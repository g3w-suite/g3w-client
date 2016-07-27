var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var merge = require('core/utils/utils').merge;
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
    primaryView: 'one'
  };
  
  this.views = {
    one: null,
    two: null
  };

  this.init = function() {
  };
  
  this.addComponent = function(component) {
    // la viewport accetta al massimo due viste, ognuna contente un componente. Se viene richiesta l'aggiunta di più di due componenti questi vengono ignorati
    var spaceAvailable = !(this.views.one && this.views.two);
    if (!spaceAvailable) {
      return;
    }
    
    // il primo componente ad essere aggiunto avrà il tag 'one'
    var viewtag = this.views.one ? 'one' : 'two';
    var view = new View({
      el: '#g3w-view-'+viewtag
    });
    this.views[viewtag] = view;
    
    
    // il primo componente viene settato automaticamente come vista primaria
    if (viewtag == 'one') {
      this.setPrimaryView('one');
    }

    component.mount('#g3w-view-'+viewtag);
  };
  
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
};
inherit(ViewportService, G3WObject);

module.exports = {
  ViewportService: new ViewportService,
}
