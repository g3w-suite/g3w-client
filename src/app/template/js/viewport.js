var inherit = require('sdk').core.utils.inherit;
var base = require('sdk').core.utils.base;
var merge = require('sdk').core.utils.merge;
var G3WObject = require('sdk').core.G3WObject;
var GUI = require('sdk').gui.GUI;

var ViewportComponent = Vue.component('viewport',{
  template: require('../html/viewport.html')
})

var ViewportService = function(){  
  this.state = {
    primaryView: 'one'
  };
  
  this._viewsById = {};

  // meccanismo per il ricalcolo delle dimensioni della viewport e dei suoi componenti figli
  (function reflow(viewsById) {
    var drawing = false;
    var resizeFired = false;
    
    var components = null;
    
    function triggerResize() {
      resizeFired = true;
      drawResize();
    } 
    
    function viewportHeight(){
      var topHeight = $(".navbar").innerHeight();
      return $(window).innerHeight() - topHeight;
    };
    
    function viewportWidth() {
      var offset = $(".main-sidebar").offset().left;
      var width = $(".main-sidebar").innerWidth();
      var sideBarSpace = width + offset;
      return $(window).innerWidth() - sideBarSpace;
    };

    function drawResize() {
      if (resizeFired === true) {
          resizeFired = false;
          drawing = true;
          layout();
          requestAnimationFrame(drawResize);
      } else {
          drawing = false;
      }
    }
    
    function layout() {
      if (!components){
        components = _.map(viewsById,function(view){ return view.component; });
      }
      var width = viewportWidth();
      var height = viewportHeight();
      _.forEach(components,function(component){
        // viene chiamato il metodo per il ricacolo delle dimensioni nei componenti figli
        component.layout(width,height);
      })
    }
    
    GUI.on('ready',function(){
      // primo layout
      layout();
      
      // resize scatenato da GUI
      GUI.on('guiresized',function(){
        triggerResize();
      });
      
      // resize della window
      $(window).resize(function() {
        // set resizedFired to true and execute drawResize if it's not already running
        if (drawing === false) {
            triggerResize();
        }
      });
      
      // resize sul ridimensionamento della sidebar
      $('.main-sidebar').on('webkitTransitionEnd transitionend msTransitionEnd oTransitionEnd', function () {
          $(this).trigger('trans-end');
          triggerResize();
      });
    });

  })(this._viewsById);
  
  
  /* INTERFACCIA PUBBLICA */
  
  this.addComponent = function(component) {
    var self = this;
    // la viewport accetta al massimo due viste, ognuna contente un componente. Se viene richiesta l'aggiunta di più di due componenti questi vengono ignorati
    var spaceLeft = 2 - _.keys(self._viewsById).length;
    if (spaceLeft <= 0) {
      return;
    }
    
    // il primo componente ad essere aggiunto avrà il tag 'one'
    var viewtag = (spaceLeft == 2) ? 'one' : 'two';
    
    // il primo componente viene settato automaticamente come vista primaria
    if (viewtag == 'one') {
      //this.setPrimaryView('one');
    }

    component.mount('#g3w-view-'+viewtag,true).
    then(function(){
      var componentId = component.getId();
      self._viewsById[componentId] = {
        viewTag: viewtag,
        component: component
      }
    })
  };
  
  
};
inherit(ViewportService, G3WObject);

module.exports = {
  ViewportService: new ViewportService,
}
