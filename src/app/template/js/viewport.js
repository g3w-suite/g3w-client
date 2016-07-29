var inherit = require('sdk').core.utils.inherit;
var base = require('sdk').core.utils.base;
var merge = require('sdk').core.utils.merge;
var G3WObject = require('sdk').core.G3WObject;
var GUI = require('sdk').gui.GUI;

var ViewportService = function(){  
  this.state = {
    primaryView: 'one', // di default la vista primaria è la prima
    secondaryVisible: false,
    viewSizes: {
      one: {
        width: 0,
        height: 0
      },
      two: {
        width: 0,
        height: 0
      }
    }
  };
  
  this._viewsByComponentId = {};
  var _components = null;
  
  /* INTERFACCIA PUBBLICA */
  
  this.addComponent = function(component) {
    var self = this;
    // la viewport ha al massimo due viste, ognuna contente al massimo un componente. Se viene richiesta l'aggiunta di più di due componenti questi vengono ignorati
    var spaceLeft = 2 - _.keys(self._viewsByComponentId).length;
    if (spaceLeft <= 0) {
      return;
    }
    
    // il primo componente ad essere aggiunto avrà il tag 'one'
    var viewTag = (spaceLeft == 2) ? 'one' : 'two';
    
    // il primo componente viene settato automaticamente come vista primaria
    if (viewTag == 'one') {
      //this.setPrimaryView('one');
    }

    component.mount('#g3w-view-'+viewTag,true).
    then(function(){
      var componentId = component.getId();
      self._viewsByComponentId[componentId] = {
        viewTag: viewTag,
        component: component
      }
    });
  };
  
  /* FINE INTERFACCIA PUBBLICA */
  
  this._calcViewSizes = function() {
    var self = this;
    _.forEach(_.keys(this.state.viewSizes),function(viewTag){
      self._calcViewSize(viewTag)
    })
  };
  
  this._calcViewSize = function(viewTag) {
    var isPrimary = this.state.primaryView == viewTag ? true : false;
    if (isPrimary) {
      var otherTag = this._otherTag(viewTag);
      
      var viewportWidth = this._viewportWidth();
      var viewportHeight = this._viewportHeight();

      otherWidth = this.state.viewSizes[otherTag].width;
      otherHeight = this.state.viewSizes[otherTag].height;
      
      var viewWidth = viewportWidth - otherWidth;
      var viewHeight = viewportHeight - otherHeight;
      
      this.state.viewSizes[viewTag].width = viewWidth;
      this.state.viewSizes[viewTag].height = viewHeight;
    }
    else {
      if (!this.state.secondaryVisible) {
        this.state.viewSizes[viewTag].width = 0;
        this.state.viewSizes[viewTag].height = 0;
      }
    }
  };
  
  this._otherTag = function(viewTag) {
    return (viewTag == 'one') ? 'two' : 'one';
  }
  
  // meccanismo per il ricalcolo delle dimensioni della viewport e dei suoi componenti figli
  this._prepareLayout = function() {
    var self = this;
    var drawing = false;
    var resizeFired = false;
    
    function triggerResize() {
      resizeFired = true;
      drawResize();
    } 

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
      if (!_components){
        _components = _.map(self._viewsByComponentId,function(view){ return view.component; });
      }
      //var width = self._viewportWidth();
      //var height = self._viewportHeight();
      self._calcViewSizes();
      _.forEach(_components,function(component){
        // viene chiamato il metodo per il ricacolo delle dimensioni nei componenti figli
        var viewTag = self._viewsByComponentId[component.getId()].viewTag;
        var width = self.state.viewSizes[viewTag].width;
        var height = self.state.viewSizes[viewTag].height;
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
  };
  
  this._viewportHeight = function() {
      var topHeight = $(".navbar").innerHeight();
      return $(window).innerHeight() - topHeight;
    };
    
  this._viewportWidth = function() {
    var offset = $(".main-sidebar").offset().left;
    var width = $(".main-sidebar").innerWidth();
    var sideBarSpace = width + offset;
    return $(window).innerWidth() - sideBarSpace;
  };
  
  this._prepareLayout();
};
inherit(ViewportService, G3WObject);

var viewportService = new ViewportService;

var ViewportComponent = Vue.extend({
  template: require('../html/viewport.html'),
  data: function() {
    return {
      state: viewportService.state
    }
  }
})

module.exports = {
  ViewportService: viewportService,
  ViewportComponent: ViewportComponent
}
